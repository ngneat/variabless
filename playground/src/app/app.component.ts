import {fromEvent, Subject} from 'rxjs';
import {debounceTime, filter, switchMap} from 'rxjs/operators';
import ts from 'typescript';

// @ts-ignore
import variablessTypes from '@ngneat/variabless/types.d.ts?raw';
import {Component, ElementRef, ViewChild} from '@angular/core';
import {buildVariables} from '@ngneat/variabless/buildVariables';
import * as monaco from 'monaco-editor';
import {type editor, MarkerSeverity} from 'monaco-editor';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import jsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import {exampleCode} from './example';

const app = document.getElementById("app");
self.MonacoEnvironment = {
  getWorker: function (_, label) {
    switch (label) {
      case 'css':
      case 'scss':
      case 'less':
        return cssWorker();
      case 'typescript':
      case 'javascript':
        return jsWorker();
      default:
        return editorWorker();
    }
  }
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true
})
export class AppComponent {
  @ViewChild('tsEditor', { static: true }) private tsEditorContainer: ElementRef;
  @ViewChild('cssEditor', { static: true }) private cssEditorContainer: ElementRef;
  animateArrows = false;
  copyText = 'Copy code';

  private tsEditor: editor.IStandaloneCodeEditor;
  private cssEditor: monaco.editor.IStandaloneCodeEditor;
  private previousResult: string;

  ngOnInit() {
    this.initEditors();
    this.listenToValueChanges();
    this.listenToResize();
    this.buildVariables();
  }

  copyCode() {
    this.copyText = 'Copied!';
    navigator.clipboard.writeText(this.tsEditor.getValue()).then(() => {
      setTimeout(() => {
        this.copyText = 'Copy code';
      }, 1000);
    });
  }

  private initEditors() {
    monaco.languages.typescript.typescriptDefaults.addExtraLib(variablessTypes.replace(/export\s/g, ''));
    this.tsEditor = monaco.editor.create(this.tsEditorContainer.nativeElement, {
      value: exampleCode,
      language: 'typescript',
      theme: 'vs-dark'
    });
    this.cssEditor = monaco.editor.create(this.cssEditorContainer.nativeElement, {
      value: '',
      language: 'css',
      theme: 'vs-dark',
      readOnly: true
    });
  }

  private listenToValueChanges() {
    const valueChange = new Subject<void>();
    const decoratorsChange = new Subject<void>();
    const decoratorsChange$ = decoratorsChange.asObservable();
    const valueChange$ = valueChange.asObservable();
    this.tsEditor.onDidChangeModelContent(() => valueChange.next());
    this.tsEditor.onDidChangeModelDecorations(() => decoratorsChange.next());
    valueChange$
      .pipe(
        switchMap(() => decoratorsChange$),
        debounceTime(500),
        filter(() => {
          const model = this.tsEditor.getModel();
          if (model === null || model.id !== 'typescript') {
            return false;
          }
          const owner = model.id;
          const markers = monaco.editor.getModelMarkers({ owner });

          return markers.filter(({ severity }) => severity === MarkerSeverity.Error).length === 0;
        })
      )
      .subscribe(() => this.buildVariables());
  }

  private buildVariables() {
    this.loadCodeAsModule().then(rules => {
      const css = buildVariables(rules);
      if (this.previousResult !== css) {
        this.animateArrows = true;
        this.previousResult = css;
        this.cssEditor.setValue(css);
        setTimeout(() => {
          this.animateArrows = false;
        }, 1000);
      }
    });
  }

  private listenToResize() {
    fromEvent(window, 'resize')
      .pipe(debounceTime(200))
      .subscribe(() => {
        this.cssEditor.layout();
        this.tsEditor.layout();
      });
  }

  private transpileTsContentToJS() {
    return ts.transpileModule(this.tsEditor.getValue(), {
      compilerOptions: { module: ts.ModuleKind.ES2015, removeComments: true }
    }).outputText;
  }

  private loadCodeAsModule() {
    const moduleString = this.transpileTsContentToJS();
    const inlineModule = `data:text/javascript;base64,${btoa(moduleString)}`;

    return import(/* webpackIgnore: true */ inlineModule);
  }
}
