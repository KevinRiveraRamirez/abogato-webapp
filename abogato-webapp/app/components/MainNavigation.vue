<template>
  <nav>
    <ul>
      <li>
        <NuxtLink to="/"> Home </NuxtLink>
      </li>
      <li>
        <NuxtLink :to="{ path: 'about' }"> about </NuxtLink>
      </li>
      <li>
        <NuxtLink to="/pricing"> Pricing </NuxtLink>
      </li>
      <li>
        <NuxtLink to="/contact"> products </NuxtLink>
      </li>
      <li>
        <NuxtLink to="/dashboard"> Dash </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
<style scoper>
nav {
  padding: 20px;
  background-color: rgba(0, 220, 130, 0.1);
  margin-bottom: 20px;
}

ul {
  list-style: none;
  display: flex;
  gap: 20px;
  padding: 0;
  margin: 0;
}

a {
  color: #00dc82;
  text-decoration: none;
  font-weight: 500;
  transition: opacity 0.3s;
}

a:hover {
  opacity: 0.7;
}

a.router-link-active {
  text-decoration: underline;
}
</style>