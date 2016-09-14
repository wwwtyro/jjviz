const mat4 = require('gl-mat4');
const vec3 = require('gl-vec3');
const resl = require('resl');
const REGL = require('regl');
const yaml = require('js-yaml');
const queryString = require('query-string');
const Trackball = require('trackball-controller');

const createDrawCharm = require('./drawCharm');
const createDrawRelations = require('./drawRelations');

let state = {}
state.regl = REGL();
state.drawCharm = createDrawCharm(state.regl);
state.drawRelations = createDrawRelations(state.regl);
state.trackball = new Trackball(document, {drag: 0.0});
state.trackball.spin(1, 0.1);

let query = queryString.parse(location.search);

let manifest = {
  bundle: {
    type: 'text',
    src: `https://api.jujucharms.com/charmstore/v5/${query.bundle}/archive/bundle.yaml`
  }
};

resl({
  manifest: manifest,
  onDone: onLoadBundle
});

function onLoadBundle(assets) {
  let bundle = yaml.safeLoad(assets.bundle);
  // Create the charm entities.
  state.charms = {};
  for (charmName in bundle.services) {
    state.charms[charmName] = {
      position: vec3.random(vec3.create(), 0.1),
      force: vec3.create(),
      relations: [],
      texture: null
    }
  }
  // Create the relation entities.
  state.relations = [];
  for (let i = 0; i < bundle.relations.length; i++) {
    let relation = bundle.relations[i];
    let rela = relation[0].split(':')[0];
    let relb = relation[1].split(':')[0];
    state.charms[rela].relations.push(relb);
    state.charms[relb].relations.push(rela);
    state.relations.push([rela, relb]);
  }
  // Create the relation buffer.
  state.relationBuffer = state.regl.buffer(bundle.relations.length * 2 * 3);
  // Load the charm icon images.
  let manifest = {};
  for (charmName in bundle.services) {
    let charm = bundle.services[charmName].charm.replace(/^cs:/, '');
    manifest[charmName] = {
      type: 'image',
      src: `https://api.jujucharms.com/v5/${charm}/archive/icon.svg`
    }
  }
  resl({
    manifest: manifest,
    onDone: onLoadIcons
  })
}

function onLoadIcons(assets) {
  for (asset in assets) {
    state.charms[asset].texture = imageToTexture(assets[asset])
  }
  state.regl.frame(renderLoop);
}

function renderLoop(data) {
  for (let i = 0; i < 16; i++) {
    updatePositions();
  }
  let time = data.time;
  state.regl.clear({
    color: [0.9, 0.9, 0.9, 1],
    depth: 1
  });
  view = mat4.create();
  projection = mat4.create();
  view = mat4.lookAt(view, [0, 0, 10], [0, 0, 0], [0, 1, 0]);
  projection = mat4.perspective(projection, Math.PI/2, window.innerWidth/window.innerHeight, 0.01, 100);
  model = state.trackball.rotation;
  state.drawRelations({
    uModel: model,
    uView: view,
    uProjection: projection,
    aPosition: state.relationBuffer,
    count: state.relations.length * 2
  });
  for (charmName in state.charms) {
    let charm = state.charms[charmName];
    model = mat4.create();
    mat4.multiply(model, model, state.trackball.rotation);
    mat4.translate(model, model, charm.position);
    state.drawCharm({
      uModel: model,
      uView: view,
      uProjection: projection,
      uTexture: charm.texture
    });
  }
}

function updatePositions() {
  // Caluclate forces.
  for (aName in state.charms) {
    let alpha = state.charms[aName];
    alpha.force = vec3.create();
    for (bName in state.charms) {
      if (aName === bName) continue;
      let beta = state.charms[bName];
      let ba = vec3.subtract(vec3.create(), alpha.position, beta.position);
      let r = vec3.length(ba);
      let fMag = 1;
      if (alpha.relations.indexOf(bName) !== -1) {
        fMag = ljForce(r);
      } else {
        fMag = ljRepulsive(r);
      }
      fMag = Math.min(2, fMag);
      fMag = Math.max(-2, fMag);
      let baNormal = vec3.normalize(vec3.create(), ba);
      let f = vec3.scale(vec3.create(), baNormal, fMag * 0.125);
      vec3.add(alpha.force, alpha.force, f);
    }
  }
  // Update positions.
  for (charmName in state.charms) {
    let charm = state.charms[charmName];
    vec3.add(charm.position, charm.position, charm.force);
  }
  // Calculate the centroid.
  let c = [0,0,0];
  for (charmName in state.charms) {
    let p = state.charms[charmName].position;
    c[0] += p[0];
    c[1] += p[1];
    c[2] += p[2];
  }
  let Q = 1.0 / Object.keys(state.charms).length;
  c[0] *= Q; c[1] *= Q; c[2] *= Q;
  // Shift to centroid.
  for (charmName in state.charms) {
    let p = state.charms[charmName].position;
    p[0] -= c[0];
    p[1] -= c[1];
    p[2] -= c[2];
  }
  // Update relation positions.
  let buffer = [];
  for (let i = 0; i < state.relations.length; i++) {
    let relation = state.relations[i];
    let rela = relation[0];
    let relb = relation[1];
    buffer.push(state.charms[rela].position[0]);
    buffer.push(state.charms[rela].position[1]);
    buffer.push(state.charms[rela].position[2]);
    buffer.push(state.charms[relb].position[0]);
    buffer.push(state.charms[relb].position[1]);
    buffer.push(state.charms[relb].position[2]);
  }
  state.relationBuffer({
    data: buffer
  });
}

function ljForce(r) {
  // Negative derivative of the Lennard-Jones function.
  let alpha = 1.0;
  let m = 4;
  let m6 = Math.pow(m, 6);
  let r6 = Math.pow(r, 6);
  let r13 = Math.pow(r, 13);
  return (12 * alpha * m6 * (m6 - r6)) / r13;
}

function ljRepulsive(r) {
  // Negative derivative of the repulsive component of the Lennard-Jones function.
  let alpha = 1.0;
  let m = 4;
  let m12 = Math.pow(m, 12);
  let r13 = Math.pow(r, 13);
  return (12 * m12 * alpha) / r13;
}

function imageToTexture(image) {
  let canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  let ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.fillRect(0, 0, 512, 512);
  let trunc = 0.075;
  ctx.drawImage(
    image,
    image.width * trunc,
    image.height * trunc,
    image.width * (1 - trunc * 2),
    image.height * (1 - trunc * 2),
    0, 0, 512, 512
  );
  return state.regl.texture({
    min: 'linear mipmap linear',
    mag: 'linear',
    flipY: true,
    data: canvas
  });
}
