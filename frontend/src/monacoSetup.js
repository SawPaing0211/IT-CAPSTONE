// Bundles the code editor (Monaco) with the app so it works without the public CDN
// that @monaco-editor/react would otherwise load it from at run time.
// Included: editor core (find, folding, suggestions, etc.) and the Python, Java and C# syntax
// definitions the app uses, plus the editor web worker.
// Licenses: see /third-party/ (monaco-editor is MIT; its third-party notices are included).
import * as monaco from 'monaco-editor/esm/vs/editor/edcore.main'
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution'
import 'monaco-editor/esm/vs/basic-languages/java/java.contribution'
import 'monaco-editor/esm/vs/basic-languages/csharp/csharp.contribution'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { loader } from '@monaco-editor/react'

self.MonacoEnvironment = { getWorker: () => new EditorWorker() }
loader.config({ monaco })
