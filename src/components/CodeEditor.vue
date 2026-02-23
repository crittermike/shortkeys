<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { basicSetup } from 'codemirror'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorEl = ref<HTMLDivElement>()
let view: EditorView | null = null
let ignoreUpdate = false

onMounted(() => {
  if (!editorEl.value) return

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged && !ignoreUpdate) {
      emit('update:modelValue', update.state.doc.toString())
    }
  })

  view = new EditorView({
    state: EditorState.create({
      doc: props.modelValue || '',
      extensions: [
        basicSetup,
        javascript(),
        oneDark,
        keymap.of([...defaultKeymap, indentWithTab]),
        updateListener,
        cmPlaceholder('// Your code here\ndocument.body.style.background = "red";'),
        EditorView.theme({
          '&': { fontSize: '13px', maxHeight: '400px' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { fontFamily: "'SF Mono', Menlo, 'Fira Code', Consolas, monospace" },
          '.cm-gutters': { fontFamily: "'SF Mono', Menlo, 'Fira Code', Consolas, monospace" },
        }),
      ],
    }),
    parent: editorEl.value,
  })
})

watch(
  () => props.modelValue,
  (val) => {
    if (!view) return
    const current = view.state.doc.toString()
    if (val !== current) {
      ignoreUpdate = true
      view.dispatch({
        changes: { from: 0, to: current.length, insert: val || '' },
      })
      ignoreUpdate = false
    }
  },
)
</script>

<template>
  <div ref="editorEl" class="cm-wrap"></div>
</template>

<style scoped>
.cm-wrap {
  border-radius: 0 0 10px 10px;
  overflow: hidden;
}

.cm-wrap :deep(.cm-editor) {
  min-height: 180px;
}

.cm-wrap :deep(.cm-editor.cm-focused) {
  outline: none;
}
</style>
