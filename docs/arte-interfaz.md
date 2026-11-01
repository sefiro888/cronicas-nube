# Arte de interfaz

## Portada, territorios y Torre — 1 de noviembre de 2026

Seis escenas originales generadas con ImageGen: convergencia del Nexo, asedio
de la Torre y cuatro paisajes que representan a las 19 facciones. El juego usa
WebP optimizados en `public/assets/interface/`; los maestros PNG se conservan
en `tools/art-inbox/interface-2026-11/`, ignorado por Git. Las referencias
visuales utilizadas pertenecen al propio proyecto.

Inventario, usos, referencias y prompts completos en
[INTERFAZ-MUNDOS-2026-11-01](INTERFAZ-MUNDOS-2026-11-01.md).
La navegación y los textos se dibujan con HTML/CSS; las imágenes no contienen
letras, botones ni marcos de carta. Los retratos de facciones y bendiciones
reutilizan el arte existente sin sustituirlo ni alterar sus reglas.

## Cinco emblemas de relieve — 22 de octubre de 2026

Recursos originales generados para Crónicas del Nexo mediante la herramienta
integrada `imagegen`, a partir de instrucciones propias basadas en los dosieres
de facción. No se usaron imágenes de referencia ajenas, marcas ni nombres de
artistas. Esta nota registra procedencia; no atribuye una licencia de terceros.

| Facción | Diseño | Original de trabajo |
| --- | --- | --- |
| Forja | Engranaje funcional de latón envejecido y hierro azulado, remaches y eje abierto | `tools/art-inbox/ui-sigils/forja-metal-v2.png` |
| Marea | Tres olas asimétricas de vidrio marino, nácar y bronce salino | `tools/art-inbox/ui-sigils/marea-reliquia-v1.png` |
| Bestiario | Tres garras curvas de escama, cuerno y hueso con acentos de oro antiguo | `tools/art-inbox/ui-sigils/bestiario-reliquia-v1.png` |
| Plaga | Máscara de médico con pico, hierro oxidado, tela cosida y lente febril | `tools/art-inbox/ui-sigils/plaga-reliquia-v1.png` |
| Quinto Sol | Disco solar de ocho rayos escalonados, obsidiana, turquesa, jade y oro | `tools/art-inbox/ui-sigils/sol-reliquia-v1.png` |

Los maestros son PNG RGBA de 1254 × 1254, con fondo transparente real, y se
conservan en la carpeta privada de trabajo, ignorada por Git. Los derivados
para la aplicación se reducen a 300 × 300 y codifican en WebP con alfa. No se
ha modificado el contenido pictórico durante esa optimización.

La silueta completa debe mantenerse al mostrarlos: especialmente las olas de
Marea y las garras de Bestiario no admiten un recorte circular. Verificar tanto
la lectura pequeña como el relieve grande sobre el fondo de la interfaz.
Los once emblemas anteriores se conservan. El respaldo vectorial continúa
disponible si falla la carga de una imagen.
