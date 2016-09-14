module.exports = function drawRelations(regl) {

  return regl({

    vert: `
      precision mediump float;
      attribute vec3 aPosition;
      uniform mat4 uModel, uView, uProjection;
      void main() {
        gl_Position = uProjection * uView * uModel * vec4(aPosition, 1);
      }`,

    frag: `
      precision mediump float;
      void main() {
        gl_FragColor = vec4(0.5, 0.5, 0.5, 1);
      }`,

    attributes: {
      aPosition: regl.prop('aPosition')
    },

    uniforms: {
      uModel: regl.prop('uModel'),
      uView: regl.prop('uView'),
      uProjection: regl.prop('uProjection'),
    },

    primitive: 'lines',
    lineWidth: regl.limits.lineWidthDims[1],
    count: regl.prop('count')
  });

}
