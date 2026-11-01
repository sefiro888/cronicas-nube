# Repositorio de pruebas en la nube

Esto es una **copia de pruebas** de «Crónicas del Nexo», creada el 1 de
noviembre de 2026 desde `sefiro888/magicfable` (commit `a8f9c72`), para
probar las sesiones de Claude en la nube sin arriesgar el proyecto principal.

- **No publica la web.** El flujo de despliegue se ha sustituido por
  `.github/workflows/comprobar.yml`, que solo ejecuta tests, build y lint.
- **Trabaja en una rama y abre un PR**; no escribas directamente en `main`.
  El propietario revisa el PR y decide si el cambio vale la pena.
- Lo que guste se traerá después al proyecto principal a mano. Lo que no,
  se descarta sin más.
- Las reglas son las mismas: lee `AGENTS.md` y `docs/ESTADO-Y-SIGUIENTE.md`.
- No hay `node_modules`: ejecuta `npm ci` antes de nada.
- Fuera de git (y por tanto aquí) no están los maestros PNG ni
  `tools/art-inbox/`; no los regeneres ni los des por perdidos.
