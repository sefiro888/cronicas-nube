import{a as e,n as t,t as n}from"./jsx-runtime-n5LQ9ujS.js";import{Bt as r,Ht as i,It as a,P as o,St as s,Vt as c,Y as l,Z as u,_t as d,ft as f,j as p,mt as m,p as h,pt as g,rt as _,wt as v,xt as y,y as b}from"./stoneMaterial-CAxhLnMG.js";import{t as x}from"./usePageVisibility-BgL8W6zB.js";import{a as S}from"./scenarioMood-PTD96TGk.js";var C=e(t(),1),w,T=(e,t)=>{let n=Math.sin(e*127.1+t*311.7)*43758.5453;return n-Math.floor(n)};function E(){if(w)return w;let e=new Uint8Array(512*512*4);for(let t=0;t<512;t+=1)for(let n=0;n<512;n+=1){let r=n/512*5,i=t/512*5,a=Math.floor(r),o=Math.floor(i),s=1/0,c=1/0;for(let e=o-1;e<=o+1;e+=1)for(let t=a-1;t<=a+1;t+=1){let n=(t+5)%5,a=(e+5)%5,o=t+.2+T(n,a)*.6,l=e+.2+T(n+31,a+17)*.6,u=Math.hypot(r-o,i-l);u<s?(c=s,s=u):u<c&&(c=u)}let l=c-s,u=Math.min(1,Math.max(0,Math.sin(r*7+i*3)*1.8+.6)),d=Math.max(0,1-l/.009)*u,f=Math.max(0,1-l/.045)*.035+(.5+.5*Math.sin(r*Math.PI*2/5+Math.cos(i*Math.PI*2/5)))*.085,p=T(n,t),m=(t*512+n)*4;e[m]=d*255,e[m+1]=Math.min(1,f+p*.07)*255,e[m+2]=p>.992?(p-.992)/.008*255:0,e[m+3]=255}let t=new o(e,512,512,d);return t.colorSpace=``,t.wrapS=t.wrapT=y,t.magFilter=l,t.minFilter=u,t.generateMipmaps=!0,t.anisotropy=8,t.needsUpdate=!0,w=t,t}var D,O;function k(){if(D)return D;let e=new Uint8Array(256*256*4);for(let t=0;t<256;t+=1)for(let n=0;n<256;n+=1){let r=n/256*Math.PI*2,i=t/256*Math.PI*2,a=Math.sin(i*35+Math.sin(r*3)*.65),o=(Math.sin(r*3+Math.cos(i*2))*.5+.5)*22+a*1.5+T(n,t)*14,s=(t*256+n)*4;e[s]=141+o,e[s+1]=166+o,e[s+2]=180+o,e[s+3]=255}return D=new o(e,256,256,d),D.colorSpace=s,D.wrapS=D.wrapT=y,D.magFilter=l,D.minFilter=u,D.generateMipmaps=!0,D.anisotropy=8,D.needsUpdate=!0,D}function A(){if(O)return O;let e=new Uint8Array(16384*4);for(let t=0;t<128;t+=1)for(let n=0;n<128;n+=1){let r=e=>{let r=n/128*e,i=t/128*e,a=Math.floor(r),o=Math.floor(i),s=(r-a)*(r-a)*(3-2*(r-a)),c=(i-o)*(i-o)*(3-2*(i-o)),l=(t,n)=>T((a+t)%e,(o+n)%e),u=l(0,0)*(1-s)+l(1,0)*s,d=l(0,1)*(1-s)+l(1,1)*s;return u*(1-c)+d*c},i=r(3)*.5+r(7)*.32+r(19)*.18,a=Math.min(1,Math.max(0,(i-.36)/.24)),o=a*a*(3-2*a),s=(t*128+n)*4;e[s]=e[s+1]=e[s+2]=o*255,e[s+3]=255}return O=new o(e,128,128,d),O.colorSpace=``,O.wrapS=O.wrapT=y,O.magFilter=O.minFilter=l,O.needsUpdate=!0,O}var j=`
  uniform sampler2D uRipples;
  uniform sampler2D uIce;
  uniform sampler2D uReflection;
  uniform vec3 uColor;
  uniform float uHasReflection;
  uniform float uRadius;
  varying vec3 vWorld;
  varying vec4 vReflection;
  #include <fog_pars_fragment>
  void main() {
    vec3 field = texture2D(uIce, vWorld.xz * 0.071).rgb;
    vec2 slope = (texture2D(uRipples, vWorld.xz * 0.12).rg - 0.5) * 0.055;
    vec3 normal = normalize(vec3(slope.x, 1.0, slope.y));
    vec3 view = normalize(cameraPosition - vWorld);
    float fresnel = 0.12 + 0.62 * pow(1.0 - max(dot(view, normal), 0.0), 5.0);
    vec3 color = mix(uColor, vec3(0.32, 0.4, 0.45), field.g * 0.58);
    color = mix(color, uColor * 0.24, field.r * 0.68);
    color += vec3(0.07, 0.1, 0.12) * field.b * 0.4;
    if (uHasReflection > 0.5 && vReflection.w > 0.0) {
      vec2 uv = vReflection.xy / vReflection.w + slope * 0.004;
      vec3 reflected = texture2D(uReflection, clamp(uv, 0.001, 0.999)).rgb;
      color = mix(color, reflected, fresnel * (1.0 - field.g * 0.7 - field.r * 0.2));
    }
    vec3 moon = normalize(vec3(-0.35, 0.65, -0.68));
    float glint = pow(max(dot(reflect(-moon, normal), view), 0.0), 100.0);
    color += vec3(0.28, 0.37, 0.45) * glint * (1.0 - field.g) * 0.18;
    float alpha = 1.0 - smoothstep(uRadius * 0.73, uRadius, length(vWorld.xz));
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`,M=`
  uniform sampler2D uRipples;
  uniform sampler2D uReflection;
  uniform vec3 uColor;
  uniform vec3 uLightColor;
  uniform vec3 uLightDirection;
  uniform float uHasReflection;
  uniform float uTime;
  uniform float uRadius;
  varying vec3 vWorld;
  varying vec4 vReflection;
  #include <fog_pars_fragment>
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    vec2 p = vWorld.xz;
    float warp = noise(p * 0.31 + vec2(uTime * 0.006, 0.0)) * 3.8;
    float a = dot(p, vec2(0.32, 0.54)) - uTime * 0.65 + warp * 0.42;
    float b = dot(p, vec2(0.73, -0.21)) - uTime * 0.86 + warp;
    float c = dot(p, vec2(3.7, 2.2)) + uTime * 1.4 + noise(p * 0.93) * 4.3;
    float d = dot(p, vec2(8.3, -6.7)) - uTime * 1.7 + noise(p * 2.3) * 6.1;
    vec2 slope = vec2(0.32, 0.54) * cos(a) * 0.2 + vec2(0.73, -0.21) * cos(b) * 0.12
      + vec2(3.7, 2.2) * cos(c) * 0.036 + vec2(8.3, -6.7) * cos(d) * 0.011;
    vec2 fine = texture2D(uRipples, p * 0.19 + vec2(uTime * 0.006, -uTime * 0.008)).rg - 0.5;
    slope += fine * 0.4;
    vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));
    vec3 view = normalize(cameraPosition - vWorld);
    float fresnel = 0.18 + 0.7 * pow(1.0 - max(dot(view, normal), 0.0), 3.0);
    float trough = 0.72 + sin(a) * 0.15 + sin(b) * 0.08 + sin(c) * 0.035;
    vec3 color = uColor * trough;
    float sky = pow(max(dot(normal, normalize(vec3(-0.4, 0.8, 0.3))), 0.0), 9.0);
    color += vec3(0.016, 0.022, 0.026) * sky;
    if (uHasReflection > 0.5 && vReflection.w > 0.0) {
      vec2 uv = vReflection.xy / vReflection.w + slope * 0.018;
      vec3 reflected = texture2D(uReflection, clamp(uv, 0.001, 0.999)).rgb * 0.5;
      reflected += texture2D(uReflection, clamp(uv + vec2(0.0015, -0.001), 0.001, 0.999)).rgb * 0.25;
      reflected += texture2D(uReflection, clamp(uv + vec2(-0.0015, 0.001), 0.001, 0.999)).rgb * 0.25;
      color = mix(color, reflected, fresnel);
    }
    vec3 sun = normalize(uLightDirection);
    float glint = pow(max(dot(reflect(-sun, normal), view), 0.0), 95.0);
    color += uLightColor * glint * 0.28;
    float crest = smoothstep(0.92, 1.0, sin(a + fine.x * 0.8))
      * smoothstep(0.63, 0.85, noise(p * 4.5 + uTime * vec2(0.03, -0.05)))
      * smoothstep(0.3, 0.72, noise(p * 26.0 + vec2(uTime * 0.06, 0.0)));
    color += vec3(0.11, 0.14, 0.14) * crest;
    float alpha = 1.0 - smoothstep(uRadius * 0.75, uRadius, length(p));
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`,N=`
  uniform float uTime;
  uniform mat4 uReflectionMatrix;
  varying vec3 vWorld;
  varying vec4 vReflection;
  #include <fog_pars_vertex>
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec2 p = world.xz;
    world.y += sin(dot(p, vec2(0.32, 0.54)) - uTime * 0.65) * 0.045
      + sin(dot(p, vec2(0.73, -0.21)) - uTime * 0.86) * 0.018;
    vWorld = world.xyz;
    vReflection = uReflectionMatrix * world;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`,P=n(),F;function I(){if(F)return F;let e=new Uint8Array(16384*4);for(let t=0;t<128;t+=1)for(let n=0;n<128;n+=1){let r=n/128*Math.PI*2,i=t/128*Math.PI*2,a=Math.cos(r*5+i*2)*.21+Math.cos(r*11-i*3)*.11,o=Math.cos(r*5+i*2)*.14-Math.cos(r*11-i*3)*.09+Math.sin(i*13+r)*.08,s=(t*128+n)*4;e[s]=(.5+a*.5)*255,e[s+1]=(.5+o*.5)*255,e[s+2]=e[s+3]=255}return F=new o(e,128,128,d),F.colorSpace=``,F.wrapS=F.wrapT=y,F.magFilter=F.minFilter=l,F.needsUpdate=!0,F}var L=`
  uniform mat4 uReflectionMatrix;
  varying vec3 vWorld;
  varying vec4 vReflection;
  #include <fog_pars_vertex>
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vReflection = uReflectionMatrix * world;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`,R=`
  uniform sampler2D uRipples;
  uniform sampler2D uReflection;
  uniform vec3 uColor;
  uniform vec3 uLightColor;
  uniform vec3 uLightDirection;
  uniform float uHasReflection;
  uniform float uTime;
  uniform float uRadius;
  varying vec3 vWorld;
  varying vec4 vReflection;
  #include <fog_pars_fragment>
  void main() {
    vec2 flow = vec2(uTime * 0.002, -uTime * 0.003);
    vec2 slope = texture2D(uRipples, vWorld.xz * 0.075 + flow).rg - 0.5;
    slope += (texture2D(uRipples, vWorld.xz * 0.14 - flow * 0.6).gr - 0.5) * 0.35;
    vec3 normal = normalize(vec3(slope.x * 0.22, 1.0, slope.y * 0.22));
    vec3 view = normalize(cameraPosition - vWorld);
    float fresnel = 0.09 + 0.65 * pow(1.0 - max(dot(view, normal), 0.0), 5.0);
    vec3 color = uColor * (0.8 + slope.y * 0.3);
    float crest = pow(1.0 - abs(sin(vWorld.z * 6.0 + sin(vWorld.x * 1.3) * 0.5 + uTime * 0.2)), 24.0);
    crest *= pow(0.5 + 0.5 * sin(vWorld.x * 2.7 - vWorld.z * 0.8), 2.0);
    color += vec3(0.006, 0.012, 0.016) * crest;
    if (uHasReflection > 0.5 && vReflection.w > 0.0) {
      vec2 uv = vReflection.xy / vReflection.w + slope * 0.007;
      vec3 reflected = texture2D(uReflection, clamp(uv, 0.001, 0.999)).rgb;
      color = mix(color, reflected, fresnel);
    }
    vec3 moon = normalize(uLightDirection);
    float glint = pow(max(dot(reflect(-moon, normal), view), 0.0), 70.0);
    color += uLightColor * glint * 0.24;
    float alpha = 1.0 - smoothstep(uRadius * 0.73, uRadius, length(vWorld.xz));
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;function z({quality:e,reducedMotion:t,level:n=-.72,radius:o=15,color:s=`#203849`,frozen:l=!1,ocean:u=!1,geometry:d}){let{mood:y}=S(),w=(0,C.useRef)(null),T=(0,C.useRef)(null),D=x(),O=(0,C.useRef)(-1/0),k=(0,C.useMemo)(()=>e===`low`?void 0:new i(e===`high`?512:256,e===`high`?512:256),[e]),A=(0,C.useMemo)(()=>u?new m(o*2,o*2,e===`low`?48:128,e===`low`?48:128):void 0,[u,o,e]);(0,C.useEffect)(()=>()=>A?.dispose(),[A]);let F=(0,C.useMemo)(()=>({camera:new f,plane:new g,clip:new c,q:new c,direction:new r,look:new r,matrix:new _}),[]),z=(0,C.useRef)(F),B=(0,C.useMemo)(()=>new v({uniforms:{...a.clone(b.fog),uRipples:{value:I()},uReflection:{value:k?.texture??null},uIce:{value:l?E():null},uReflectionMatrix:{value:F.matrix},uHasReflection:{value:+!!k},uLightColor:{value:new p(y===`moonlight`?`#9ebede`:y===`dusk`?`#d1a2b5`:`#d9c3a0`)},uLightDirection:{value:new r(...y===`moonlight`?[-.35,.75,-.4]:[-.7,.63,.36])},uTime:{value:0},uRadius:{value:o},uColor:{value:new p(s)}},vertexShader:u?N:L,fragmentShader:l?j:u?M:R,fog:!0,transparent:!0,depthWrite:!1}),[k,F,o,s,l,u,y]);(0,C.useEffect)(()=>()=>B.dispose(),[B]),(0,C.useEffect)(()=>()=>k?.dispose(),[k]),h(({camera:i,gl:a,scene:o,clock:s})=>{if(!D.current||!w.current||!T.current||(T.current.uniforms.uTime.value=t||l?0:s.elapsedTime,!k||!(i instanceof f)||i.position.y<=n))return;let c=performance.now();if(!t&&c-O.current<(e===`high`?1e3/18:1e3/10))return;O.current=c;let u=z.current,d=u.camera;i.getWorldDirection(u.direction),u.look.copy(i.position).add(u.direction),u.look.y=n*2-u.look.y,d.position.copy(i.position),d.position.y=n*2-d.position.y,d.up.copy(i.up),d.up.y*=-1,d.lookAt(u.look),d.far=i.far,d.updateMatrixWorld(),d.projectionMatrix.copy(i.projectionMatrix),u.matrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(d.projectionMatrix).multiply(d.matrixWorldInverse),u.plane.set(new r(0,1,0),-n).applyMatrix4(d.matrixWorldInverse);let p=u.plane,m=u.clip.set(p.normal.x,p.normal.y,p.normal.z,p.constant),h=d.projectionMatrix.elements;u.q.set((Math.sign(m.x)+h[8])/h[0],(Math.sign(m.y)+h[9])/h[5],-1,(1+h[10])/h[14]),m.multiplyScalar(2/m.dot(u.q)),h[2]=m.x,h[6]=m.y,h[10]=m.z+1,h[14]=m.w;let g=a.getRenderTarget(),_=a.shadowMap.autoUpdate,v=a.xr.enabled;w.current.visible=!1;try{a.xr.enabled=!1,a.shadowMap.autoUpdate=!1,a.setRenderTarget(k),a.clear(),a.render(o,d)}finally{a.setRenderTarget(g),a.shadowMap.autoUpdate=_,a.xr.enabled=v,w.current.visible=!0}});let V=d??A;return(0,P.jsxs)(`mesh`,{ref:w,position:[0,n,0],rotation:[-Math.PI/2,0,0],children:[V?(0,P.jsx)(`primitive`,{object:V,attach:`geometry`}):(0,P.jsx)(`circleGeometry`,{args:[o,e===`low`?48:80]}),(0,P.jsx)(`primitive`,{ref:T,object:B,attach:`material`})]})}export{A as i,k as n,E as r,z as t};