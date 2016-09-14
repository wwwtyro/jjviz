module.exports = function drawCharm(regl) {

  return regl({

    vert: `
      precision mediump float;
      attribute vec3 aPosition;
      attribute vec2 aUV;
      uniform mat4 uModel, uView, uProjection;
      varying vec2 vUV;
      void main() {
        gl_Position = uProjection * uView * uModel * vec4(aPosition, 1);
        vUV = aUV;
      }`,

    frag: `
      precision mediump float;
      uniform sampler2D uTexture;
      varying vec2 vUV;
      void main() {
        vec3 rgb = texture2D(uTexture, vUV).rgb;
        gl_FragColor = vec4(rgb, 1);
      }`,

    attributes: {
      aPosition: regl.buffer(cube().positions),
      aUV: regl.buffer(cube().uvs)
    },

    uniforms: {
      uModel: regl.prop('uModel'),
      uView: regl.prop('uView'),
      uProjection: regl.prop('uProjection'),
      uTexture: regl.prop('uTexture')
    },

    count: 36
  });

}

function cube() {
  let cube = {};
  let s = 0.5;
  let a = [-s, -s, +s];
  let b = [+s, -s, +s];
  let c = [+s, +s, +s];
  let d = [-s, +s, +s];
  let e = [-s, -s, -s];
  let f = [+s, -s, -s];
  let g = [+s, +s, -s];
  let h = [-s, +s, -s];
  cube.positions = [
    a, b, c,  a, c, d, // +Z
    b, f, g,  b, g, c, // +X
    f, e, h,  f, h, g, // -Z
    e, a, d,  e, d, h, // -X
    d, c, g,  d, g, h, // +Y
    b, a, e,  b, e, f, // -Y
  ]
  a = [0, 0];
  b = [1, 0];
  c = [1, 1];
  d = [0, 1];
  cube.uvs = [
    a, b, c, a, c, d,
    a, b, c, a, c, d,
    a, b, c, a, c, d,
    a, b, c, a, c, d,
    a, b, c, a, c, d,
    a, b, c, a, c, d,
  ];
  return cube;
}
