"""Finite content arithmetic checks only. No runner, compiler, application or DB."""
import contextlib, io, itertools, json, pathlib, sys
from unittest.mock import patch
R=pathlib.Path(__file__).resolve().parent
def evaluate(source,text):
 out=io.StringIO()
 with patch.object(sys,'stdin',io.StringIO(text)),contextlib.redirect_stdout(out):
  exec(compile(source,'<proposed-content-reference>','exec'),{'__name__':'__main__'})
 return out.getvalue().strip()
def oracle(q,v):
 if q=='Q01': return str(v[0]+v[1])
 if q=='Q02': return str(sorted(v)[-1])
 if q=='Q03': return str(sum(x for x in range(v[0]+1) if x%2==0))
 # Character arithmetic is independent of the numeric division reference.
 return str(sum(ord(c)-48 for c in str(abs(v[0]))))
rows=[]
for q in json.loads((R/'REVIEWER_ONLY_TESTS.json').read_text()):
 name=q['id']; refs=[p.read_text() for p in sorted((R/name/'reference').glob('*.py'))]
 bad=(R/name/'incorrect/logical_error.py').read_text(); killed=[]
 for i,c in enumerate(q['cases']):
  want=c['expected_output'].strip(); v=list(map(int,c['input'].split()))
  assert oracle(name,v)==want
  for src in refs: assert evaluate(src,c['input'])==want
  if evaluate(bad,c['input'])!=want: killed.append(i+1)
 assert killed
 vectors={'Q01':list(itertools.product(range(-10,11),repeat=2)),
          'Q02':list(itertools.product(range(-2,3),repeat=3)),
          'Q03':[(i,) for i in range(101)]+[(100000,)],
          'Q04':[(i,) for i in range(-150,151)]+[(-1000000000,),(1000000000,),(-999999999,)]}[name]
 for v in vectors:
  for src in refs: assert evaluate(src,' '.join(map(str,v))+'\n')==oracle(name,v)
 rows.append({'quest':name,'complete_cases':len(q['cases']),'primary_and_alternative_python_match_all_cases':True,'additional_vectors_per_reference':len(vectors),'intentional_wrong_python_rejected_by_cases':killed,'java_csharp':'source/manual algorithm review only; NOT compiled or run'})
(R/'REFERENCE_CHECK_RESULTS.json').write_text(json.dumps(rows,indent=2))
print(json.dumps(rows,indent=2))
