import{a as e,n as t,t as n}from"./jsx-runtime-n5LQ9ujS.js";import{t as r}from"./Sparkles-CnTaDCFz.js";import{It as i,ct as a,p as o,t as s,wt as c,y as l}from"./stoneMaterial-CAxhLnMG.js";import{l as u}from"./textures-DrvTwfDb.js";import{t as d}from"./usePageVisibility-BgL8W6zB.js";import{i as f,n as p,r as m,t as h}from"./DistantVista-rHYhVqBl.js";import{t as g}from"./AtmosphericPlumes-Citst7Ja.js";import{i as _,n as v,r as y,t as b}from"./shoreGeometry-Dv2-7a17.js";import{t as x}from"./ReflectiveWater-BCYOHreg.js";var S=e(t(),1),C=n();function w({quality:e,reducedMotion:t}){let n=(0,S.useRef)(null),r=d(),i=(0,S.useMemo)(()=>new a,[]),c=s(`limestone`),l=s(`granite`);return o(({clock:e})=>{let n=t?.7:e.elapsedTime*.18;r.current&&(i.position.set(5.9+Math.cos(n)*7,-.45,-5.6+Math.sin(n)*7),i.updateMatrixWorld())}),(0,C.jsxs)(C.Fragment,{children:[(0,C.jsx)(`primitive`,{object:i}),(0,C.jsxs)(`group`,{position:[5.9,-.6,-5.6],rotation:[0,-.35,0],children:[[0,1,2].map(t=>(0,C.jsxs)(`mesh`,{scale:[.27,.7,.24],receiveShadow:e!==`low`,castShadow:e===`high`,children:[(0,C.jsx)(`primitive`,{object:_(t),attach:`geometry`}),(0,C.jsx)(`meshStandardMaterial`,{...l,color:`#626c6b`,bumpScale:.045,roughness:.67})]},t)),Array.from({length:6},(t,n)=>(0,C.jsxs)(`mesh`,{name:`shore-beacon-rib-${n}`,rotation:[0,n/6*Math.PI*2,0],castShadow:e!==`low`,receiveShadow:e!==`low`,children:[(0,C.jsx)(`primitive`,{object:b(),attach:`geometry`}),(0,C.jsx)(`meshStandardMaterial`,{...c,color:`#c7c0a5`,bumpScale:.025,roughness:.83})]},n)),[2,2.7].map(t=>(0,C.jsxs)(`mesh`,{position:[0,t,0],rotation:[Math.PI/2,0,0],castShadow:e!==`low`,children:[(0,C.jsx)(`torusGeometry`,{args:[.62,.045,8,e===`low`?20:40]}),(0,C.jsx)(`meshStandardMaterial`,{color:`#786a46`,metalness:.58,roughness:.62})]},t)),Array.from({length:8},(e,t)=>{let n=t/8*Math.PI*2;return(0,C.jsxs)(`mesh`,{position:[Math.cos(n)*.6,2.35,Math.sin(n)*.6],children:[(0,C.jsx)(`cylinderGeometry`,{args:[.018,.025,.7,5]}),(0,C.jsx)(`meshStandardMaterial`,{color:`#817350`,metalness:.48,roughness:.62})]},t)}),(0,C.jsxs)(`mesh`,{name:`shore-beacon-lens`,position:[0,2.45,0],scale:[.32,.36,.32],children:[(0,C.jsx)(`sphereGeometry`,{args:[1,e===`low`?12:24,16]}),(0,C.jsx)(`meshStandardMaterial`,{color:`#e9be77`,emissive:`#e39836`,emissiveIntensity:.95,roughness:.3})]}),(0,C.jsx)(`pointLight`,{position:[0,2.35,0],color:`#ffd59b`,intensity:1.1,distance:4,decay:2}),(0,C.jsx)(`sprite`,{position:[0,2.35,0],scale:[1.3,1.3,1],children:(0,C.jsx)(`spriteMaterial`,{map:u(`gold`),blending:2,opacity:.26,transparent:!0,depthWrite:!1})})]}),e!==`low`&&(0,C.jsx)(`spotLight`,{ref:n,name:`shore-beacon-sweep`,position:[5.9,1.75,-5.6],target:i,intensity:24,angle:.18,penumbra:.8,distance:15,color:`#ffe1a8`})]})}function T({quality:e}){let t=s(`granite`);return(0,C.jsxs)(C.Fragment,{children:[[0,1,2].map(n=>(0,C.jsxs)(`mesh`,{name:`shore-shelf-${n}`,receiveShadow:e!==`low`,castShadow:e===`high`,children:[(0,C.jsx)(`primitive`,{object:_(n),attach:`geometry`}),(0,C.jsx)(`meshStandardMaterial`,{...t,color:n===0?`#728080`:`#4a5a61`,bumpScale:.035,roughness:n===0?.5:.72,metalness:.015})]},n)),(0,C.jsxs)(`mesh`,{name:`shore-sea-arch`,position:[-7.1,-.78,-5.5],rotation:[0,.32,0],castShadow:e!==`low`,receiveShadow:e!==`low`,children:[(0,C.jsx)(`primitive`,{object:v(),attach:`geometry`}),(0,C.jsx)(`meshStandardMaterial`,{...t,color:`#6b7776`,bumpScale:.055,roughness:.76,metalness:.01})]})]})}var E=`
  varying vec2 vUv;
  varying vec3 vWorld;
  #include <fog_pars_vertex>
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`,D=`
  uniform float uTime;
  uniform float uSurge;
  varying vec2 vUv;
  varying vec3 vWorld;
  #include <fog_pars_fragment>
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    vec2 p = vWorld.xz;
    float grain = noise(p * 6.5 + uTime * vec2(0.035, -0.06));
    float coast = noise(p * 1.7) * 0.8 + grain * 0.17;
    float phase = dot(p, vec2(0.85, 1.4)) - uTime * 0.55 + coast;
    float front = pow(0.5 + 0.5 * cos(phase), 8.0);
    float broken = smoothstep(0.5, 0.79, grain * 0.65 + noise(p * 2.7) * 0.35);
    float fade = smoothstep(0.0, 0.13, vUv.y) * (1.0 - smoothstep(0.72, 1.0, vUv.y));
    float lace = smoothstep(0.23, 0.68, noise(p * 35.0 + vec2(uTime * 0.04, -uTime * 0.07)));
    float alpha = front * broken * fade * lace * (0.62 + uSurge * 0.25);
    gl_FragColor = vec4(vec3(0.68, 0.77, 0.75), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;function O({quality:e,reducedMotion:t,event:n}){let r=(0,S.useRef)(0),a=(0,S.useRef)(null),s=d(),u=(0,S.useMemo)(()=>new c({uniforms:{...i.clone(l.fog),uTime:{value:0},uSurge:{value:0}},vertexShader:E,fragmentShader:D,transparent:!0,depthWrite:!1,fog:!0}),[]);return(0,S.useEffect)(()=>()=>u.dispose(),[u]),(0,S.useEffect)(()=>{(n?.type===`nexus-damage`||n?.type===`victory`)&&(r.current=1)},[n]),o(({clock:e},n)=>{!s.current||!a.current||(r.current=Math.max(0,r.current-n*.35),a.current.uniforms.uTime.value=t?0:e.elapsedTime,a.current.uniforms.uSurge.value=t?0:r.current)}),(0,C.jsxs)(`mesh`,{name:`shore-foam`,children:[(0,C.jsx)(`primitive`,{ref:a,object:u,attach:`material`}),(0,C.jsx)(`primitive`,{object:y(e===`low`),attach:`geometry`})]})}var k=[{position:[-7.2,-.65,-5.3],spread:3.5,height:1.3,density:.14,color:`#c0d0cc`,seed:4},{position:[7.4,-.7,-6.2],spread:4.3,height:1.1,density:.12,color:`#c5d4cf`,seed:8},{position:[0,-.8,-11],spread:6.5,height:1.1,density:.12,color:`#aebfc0`,seed:13}];function A({quality:e,reducedMotion:t,event:n}){return(0,C.jsxs)(C.Fragment,{children:[(0,C.jsx)(p,{intensity:.27,color:`#b1c5cb`}),(0,C.jsx)(f,{intensity:.36,color:`#c5d7dd`,groundColor:`#565750`}),(0,C.jsx)(m,{position:[-9,11,5],intensity:2.2,color:`#ffdfad`,castShadow:e!==`low`,"shadow-mapSize-width":e===`high`?2048:1024,"shadow-mapSize-height":e===`high`?2048:1024,"shadow-camera-left":-13,"shadow-camera-right":13,"shadow-camera-top":13,"shadow-camera-bottom":-13,"shadow-bias":-6e-4}),(0,C.jsx)(m,{position:[8,7,-9],intensity:.58,color:`#a1c2d2`}),(0,C.jsx)(h,{image:`/assets/scenarios/shore-vista-v1${e===`low`?`-low`:``}.webp`}),(0,C.jsx)(x,{quality:e,reducedMotion:t,ocean:!0,level:-.76,radius:18,color:`#20363d`}),(0,C.jsx)(T,{quality:e}),(0,C.jsx)(w,{quality:e,reducedMotion:t}),(0,C.jsx)(O,{quality:e,reducedMotion:t,event:n}),(0,C.jsx)(g,{vents:k,quality:e,reducedMotion:t}),e!==`low`&&(0,C.jsx)(r,{count:e===`high`?32:14,scale:[16,1.5,14],position:[0,.1,-1],size:1.2,speed:t?0:.17,opacity:.27,color:`#d8e4df`})]})}export{A as TidalShore};