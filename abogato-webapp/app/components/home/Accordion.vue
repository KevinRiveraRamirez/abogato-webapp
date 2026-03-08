<script setup lang="ts">
import type { AccordionItem } from '@nuxt/ui'

const items = ref<AccordionItem[]>([
  {
    label: '¿Cómo funciona el sistema?',
    icon: 'i-lucide-circle-help',
    content: 'Creás una cuenta, describís tu trámite o consulta legal y un abogado asignado lo revisará. Podés hacer seguimiento del estado desde tu panel en tiempo real.'
  },
  {
    label: '¿Los documentos tienen validez legal?',
    icon: 'i-lucide-shield-check',
    content: 'Sí. Todos los documentos generados a través de nuestra plataforma son firmados por abogados colegiados y tienen plena validez ante las autoridades costarricenses.'
  },
  {
    label: '¿Cuánto tarda en resolverse un caso?',
    icon: 'i-lucide-clock',
    content: 'Depende del tipo de trámite. Consultas simples se responden en 24–48 horas. Trámites notariales como traspasos pueden tomar entre 3 y 10 días hábiles según su complejidad.'
  },
  {
    label: '¿Puedo subir documentos adjuntos?',
    icon: 'i-lucide-paperclip',
    content: 'Sí. Al crear o responder un ticket podés adjuntar archivos como contratos, identificaciones o cualquier documento relevante para tu caso.'
  }
])
</script>

<template>
  <UAccordion :unmount-on-hide="false" :items="items" />
</template>
