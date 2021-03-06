import {
  watch,
  ref,
  onMounted
} from " https://visualia.github.io/visualia/src/deps/vue.js";
import * as monaco from "../deps/editor.js";
import {
  provideComponentsCompletion,
  provideComponentsHover
} from "./providers.js";

self.MonacoEnvironment = {
  getWorkerUrl: function(moduleId, label) {
    if (label === "html") {
      return "./deps/html.worker.js";
    }
    return "./deps/editor.worker.js";
  }
};

export const VMonaco = {
  props: { content: { default: "" } },
  setup(props, { emit }) {
    const el = ref(null);

    monaco.languages.register({ id: "visualia" });
    // https://github.com/microsoft/monaco-languages/blob/master/src/markdown/markdown.ts
    monaco.languages
      .getLanguages()
      .filter(({ id }) => id == "markdown")[0]
      .loader()
      .then(({ language, conf }) => {
        // https://github.com/microsoft/monaco-languages/blob/master/src/html/html.ts#L17
        conf.wordPattern = /(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g;
        monaco.languages.setLanguageConfiguration("visualia", conf);

        language.tokenizer.html = [
          [/<([\w-]+)\/>/, "tag"],
          [
            /<([\w-]+)/,
            {
              cases: {
                "@empty": { token: "tag", next: "@tag.$1" },
                "@default": { token: "tag", next: "@tag.$1" }
              }
            }
          ],
          [/<\/([\w-]+)\s*>/, { token: "tag" }],
          [/<!--/, "comment", "@comment"]
        ];
        monaco.languages.setMonarchTokensProvider("visualia", language);
      });

    onMounted(() => {
      // Setting up autcomplete and hover providers

      monaco.languages.registerCompletionItemProvider("visualia", {
        provideCompletionItems: provideComponentsCompletion
      });
      monaco.languages.registerHoverProvider("visualia", {
        provideHover: provideComponentsHover
      });

      // Setting up editor

      const editor = monaco.editor.create(el.value, {
        language: "visualia",
        theme: "vs-dark",
        fontSize: "15px",
        wordWrap: "wordWrapColumn",
        wordWrapColumn: 75,
        lineNumbers: "off",
        minimap: {
          enabled: false
        }
      });
      const model = editor.getModel();
      model.updateOptions({ tabSize: 2 });

      // When editor content changes
      // we emit input event so the component
      // works with v-model

      editor.onDidChangeModelContent(e => {
        emit("input:content", editor.getValue());
      });

      // We only change editor content
      // when value prop is really different
      // from what we emitted for v-model
      // otherwise we get the recursive loop

      watch(
        () => props.content,
        content => {
          if (content !== editor.getValue()) {
            model.pushEditOperations(
              [],
              [
                {
                  range: model.getFullModelRange(),
                  text: content
                }
              ]
            );
          }
        }
      );
    });

    return { el };
  },
  template: `
    <div ref="el" style="height: 100vh" />
  `
};
