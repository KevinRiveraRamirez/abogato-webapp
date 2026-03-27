<!-- Landing principal del sitio público. -->

<template>
  <MarketingHeroSection />

  <MarketingImageShowcase
    img1="https://images.unsplash.com/photo-1761839258045-6ef373ab82a7?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDF8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    img2="https://images.unsplash.com/photo-1772306105241-fc51849ab40d?q=80&w=1471&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  />
  <MarketingBenefitsGrid />

  <MarketingServiceCardsSection
    title="Trámites fáciles y seguros"
    description="Simplificamos los procesos legales para que puedas resolver tus trámites sin complicaciones ni pérdidas de tiempo. Te acompañamos en cada etapa con asesoría profesional, gestión digital eficiente y total respaldo jurídico."
    ctaText="Ver todos los servicios"
    ctaHref="/servicios"
    :cards="cards"
  />
  <UPageSection
    title="Preguntas frecuentes"
    description="Algunas dudas comunes sobre nuestros servicios y cómo funciona la plataforma."
  />
  <MarketingFaqAccordion />
</template>

<script setup>
definePageMeta({ layout: "public" });

const cards = [
  {
    title: "Traspaso Casa",
    description:
      "Gestión completa del traspaso de propiedad ante notario, incluyendo redacción de escritura, validación registral y presentación ante el Registro Nacional.",
  },
  {
    title: "Traspaso Vehículo",
    description:
      "Formalización legal del cambio de propietario de un vehículo, verificación de gravámenes y presentación del trámite ante las autoridades correspondientes.",
  },
  {
    title: "Matrimonio",
    description:
      "Asesoría y formalización del matrimonio civil, elaboración del acta notarial y acompañamiento en todo el proceso legal requerido.",
  },
  {
    title: "Impuestos",
    description:
      "Asesoría en obligaciones tributarias, declaración de impuestos y cumplimiento de requisitos fiscales para personas y empresas.",
  },
];
</script>
