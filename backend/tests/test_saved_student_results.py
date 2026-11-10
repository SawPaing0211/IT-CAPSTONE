"""Read-only saved-result route checks against a fresh synthetic SQLite file."""
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

if __name__ == '__main__':
    os.environ['DATABASE_URL'] = 'sqlite:///' + str(Path(tempfile.gettempdir()) / ('forge-results-' + os.urandom(8).hex() + '.db')).replace('\\', '/')
    os.environ['FORGE_AUTO_SCHEMA'] = '1'
    os.environ['FORGE_ENV'] = 'development'
    os.environ['HEAD_ADMIN_USER_ID'] = ''
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app as A
from flask_jwt_extended import create_access_token


class SavedResultsTests(unittest.TestCase):
    def setUp(self):
        self.ctx = A.app.app_context()
        self.ctx.push()
        self.owner = A.User(username='result_owner',email='owner@example.test',password_hash='unused',role='student',xp=60)
        self.other = A.User(username='result_other',email='other@example.test',password_hash='unused',role='student',xp=0)
        A.db.session.add_all([self.owner,self.other])
        A.db.session.flush()
        self.quest = A.Problem(title='Saved results',description='Synthetic',difficulty='Easy',xp_reward=50,languages=['python','java'],test_cases=[])
        A.db.session.add(self.quest)
        A.db.session.flush()
        self.sub = A.Submission(user_id=self.owner.id,problem_id=self.quest.id,code='private code',language='python',status='accepted',score=50,passed_cases=2,total_cases=2,
            result_details={'runner':'docker-sandbox','tests':[
                {'passed':True,'hidden':False,'kind':'passed','runtime':'0.25s'},
                {'passed':True,'hidden':True,'input':'HIDDEN INPUT','expected':'HIDDEN EXPECTED','output':'HIDDEN OUTPUT','message':'HIDDEN MESSAGE','runtime':'0.30s'}]})
        A.db.session.add(self.sub)
        A.db.session.commit()
        self.headers = {'Authorization':'Bearer '+create_access_token(identity=str(self.owner.id))}
        self.client = A.app.test_client()
        self.no_execution = patch.object(A,'evaluate_code',side_effect=AssertionError('Saved results must never execute code'))
        self.no_execution.start()

    def tearDown(self):
        self.no_execution.stop()
        A.db.session.rollback()
        A.db.session.delete(self.sub)
        A.db.session.delete(self.quest)
        A.db.session.delete(self.owner)
        A.db.session.delete(self.other)
        A.db.session.commit()
        A.db.session.remove()
        self.ctx.pop()

    def get_result(self):
        return self.client.get(f'/api/problems/{self.quest.id}/my-submission',headers=self.headers)

    def test_restores_safe_cases_without_writes_or_execution(self):
        before = (A.Submission.query.count(),A.SubmissionSlot.query.count(),self.owner.xp,self.sub.score)
        for _ in range(2):
            response = self.get_result()
            self.assertEqual(response.status_code,200)
            result = response.get_json()['submissions'][0]
            self.assertTrue(result['results_recorded'])
            self.assertEqual((result['status'],result['score'],result['passed_cases'],result['total_cases']),('accepted',50,2,2))
            self.assertEqual(result['test_results'][0]['runtime'],'0.25s')
            self.assertTrue(result['test_results'][1]['hidden'])
            self.assertNotIn('HIDDEN',response.get_data(as_text=True))
            self.assertNotIn('private code',response.get_data(as_text=True))
        self.assertEqual(before,(A.Submission.query.count(),A.SubmissionSlot.query.count(),self.owner.xp,self.sub.score))

    def test_legacy_or_incomplete_details_are_not_fabricated(self):
        for details in [None,{'tests':[]},{'tests':['invalid','invalid']}]:
            self.sub.result_details = details
            A.db.session.commit()
            result = self.get_result().get_json()['submissions'][0]
            self.assertFalse(result['results_recorded'])
            self.assertEqual(result['test_results'],[])
            self.assertEqual(result['score'],50)

    def test_missing_visibility_is_hidden_and_language_is_not_invented(self):
        self.sub.result_details = {'tests':[{'passed':True,'output':'SECRET'},{'passed':True,'hidden':True,'output':'SECRET'}]}
        A.db.session.commit()
        response = self.get_result()
        self.assertNotIn('SECRET',response.get_data(as_text=True))
        self.assertEqual(response.get_json()['languages_done'],['python'])
        self.assertEqual(len(response.get_json()['submissions']),1)

    def test_other_student_cannot_read_result(self):
        self.headers = {'Authorization':'Bearer '+create_access_token(identity=str(self.other.id))}
        response = self.get_result().get_json()
        self.assertFalse(response['has_submitted'])
        self.assertEqual(response['submissions'],[])

    def test_author_can_inspect_current_hidden_definitions_without_student_exposure(self):
        teacher = A.User(username='case_author', email='author@example.test', password_hash='unused', role='instructor')
        outsider = A.User(username='case_outsider', email='outsider@example.test', password_hash='unused', role='instructor')
        A.db.session.add_all([teacher, outsider]); A.db.session.flush()
        self.quest.created_by = teacher.id
        self.quest.test_cases = [{'input': 'PRIVATE CASE', 'expected': 'PRIVATE EXPECTED', 'visible': False}]
        A.db.session.commit()
        url = f'/api/instructor/submissions/{self.sub.id}/code'
        headers = lambda user: {'Authorization': 'Bearer '+create_access_token(identity=str(user.id))}
        try:
            before = (self.owner.xp, self.sub.score, A.Submission.query.count(), A.SubmissionSlot.query.count())
            response = self.client.get(url, headers=headers(teacher))
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json['current_test_cases'], [{'index': 1, 'input': 'PRIVATE CASE', 'expected': 'PRIVATE EXPECTED', 'hidden': True}])
            self.assertTrue(response.json['test_results'][1]['passed'])
            self.assertNotIn('current_test_cases', self.get_result().json['submissions'][0])
            self.assertNotIn('PRIVATE', self.get_result().get_data(as_text=True))
            self.assertEqual(self.client.get(url, headers=self.headers).status_code, 403)
            self.assertEqual(self.client.get(url, headers=headers(outsider)).status_code, 403)
            self.assertEqual(before, (self.owner.xp, self.sub.score, A.Submission.query.count(), A.SubmissionSlot.query.count()))
        finally:
            self.quest.created_by = None
            A.db.session.delete(teacher); A.db.session.delete(outsider); A.db.session.commit()


if __name__ == '__main__':
    unittest.main()
