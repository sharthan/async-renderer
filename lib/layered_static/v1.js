'use strict'

const Jimp = require('jimp');

const KEY_FIXED_ROTATION = "fixed-rotation";
const KEY_ORBIT_ROTATION = "orbit-rotation";
const KEY_ANCHOR = "anchor";
const KEY_SCALE = "scale";

const KEY_COLOR = "color";
const KEY_ALPHA = "alpha";
const KEY_OPACITY = "opacity";
const KEY_HUE = "hue";
const KEY_BRIGHTNESS = "brightness";
const KEY_SATURATION = "saturation";

const KEY_HARDLIGHT = "hardlight";
const KEY_MULTIPLY = "multiply";
const KEY_LIGHTEN = "lighten";
const KEY_OVERLAY = "overlay";

const KEY_RED = "red";
const KEY_GREEN = "green";
const KEY_BLUE = "blue";

const KEY_FIXED_POSITION = "fixed-position";
const KEY_RELATIVE_POSITION = "relative-position";
const KEY_X = "x";
const KEY_Y = "y";
const KEY_MULTIPLIER = "multiplier";
const KEY_VISIBLE = "visible";
const KEY_URI = "uri";
const KEY_STATES = "states";
const KEY_WIDTH = "width";
const KEY_HEIGHT = "height";
const KEY_MIRROR = "mirror";

async function render(connector, layout, tokens, tokenId) {
  /// make sure token ID is an int
  tokenId = parseInt(tokenId);

  let image = null;

  for (var i = 0; i < layout.layers.length; i++) {
    console.log(`${process.memoryUsage().rss / 1024 / 1024} MB`);

    // TODO sort layers by z_order?
    let layer = layout.layers[i];

    console.log(`rendering layer: ${i + 1} of ${layout.layers.length} (${layer.id})`);

    while (KEY_STATES in layer) {
      const uriIndex = await readIntProperty(layer, KEY_STATES, "Layer Index", tokens, tokenId);
      layer = layer[KEY_STATES].options[uriIndex];
    }

    // check if this layer has visbility controls
    if (KEY_VISIBLE in layer) {
      const isVisible = (await readIntProperty(layer, KEY_VISIBLE, "Layer Visible", tokens, tokenId)) === 1;
      if (isVisible === false) {
        console.log("  NOT VISIBLE. SKIPPING.")
        continue;
      }
    }

    let layerImage = null;

    if (layer.uri === undefined) {
      layerImage = await new Jimp(layer[KEY_WIDTH], layer[KEY_HEIGHT]);
    } else {
      const buffer = await connector.loadFromURI(layer.uri);
      layerImage = await Jimp.read(buffer);
    }

    image = await renderLayer(image, layout, layer, layerImage, tokens, tokenId);
  }
  return image;
}

async function readIntProperty(object, key, label, tokens, masterTokenId) {
  let value = object[key];

  // check if value is an object. If so then we need to check the contract value
  if (typeof value === "object") {
    const tokenId = object[key]["token-id"] + masterTokenId; // layer token ids are relative to their master token id
    const leverId = object[key]["lever-id"];
    // tokens[tokenId] is in format [minValue, maxValue, currentValue, ..., ..., ...]
    // so currentValue for the lever we want will be index 2, 5, 8, 11, etc.
    value = parseInt((await tokens.getControlToken(tokenId))[2 + (leverId * 3)]);
    console.log(`    ${label} = ${value} (TokenId=${tokenId}, LeverId=${leverId})`);
  } else {
    console.log(`  ${label} = ${value}`);
  }

  return value;
}

function getLayerWithId(layout, layerId) {
  for (let layer of layout.layers) {
    if (layer.id == layerId) {
      if (KEY_STATES in layer) {
        for (let option of layer[KEY_STATES].options) {
          if (option.active) {
            return option;
          }
        }
      } else {
        return layer;
      }
    }
  }
  return null;
}

async function renderLayer(image, layout, layer, layerImage, tokens, tokenId) {
  // scale the layer (optionally)
  let bitmapWidth = layerImage.bitmap.width;
  let bitmapHeight = layerImage.bitmap.height;

  if (KEY_SCALE in layer) {
    const scaleX = (await readIntProperty(layer[KEY_SCALE], KEY_X, "Layer Scale X", tokens, tokenId)) / 100;
    const scaleY = (await readIntProperty(layer[KEY_SCALE], KEY_Y, "Layer Scale Y", tokens, tokenId)) / 100;

    if ((scaleX == 0) || (scaleY == 0)) {
      console.log("  Scale X or Y is 0 -- returning currentImage.")
      return image;
    }
    // determine the new width
    bitmapWidth = layerImage.bitmap.width * scaleX;
    bitmapHeight = layerImage.bitmap.height * scaleY;
    // resize the image
    layerImage.resize(bitmapWidth, bitmapHeight);
  }

  // rotate the layer (optionally)
  if (KEY_FIXED_ROTATION in layer) {
    let rotation = await readIntProperty(layer, KEY_FIXED_ROTATION, "Layer Fixed Rotation", tokens, tokenId);

    if (KEY_MULTIPLIER in layer[KEY_FIXED_ROTATION]) {
      const multiplier = await readIntProperty(layer[KEY_FIXED_ROTATION], KEY_MULTIPLIER, "Rotation Multiplier", tokens, tokenId);
      rotation *= multiplier;
    }

    layerImage.rotate(rotation, true);

    // adjust for the new width and height based on the rotation
    bitmapWidth = layerImage.bitmap.width;
    bitmapHeight = layerImage.bitmap.height;
  }

  // check for mirror
  if (KEY_MIRROR in layer) {
    const shouldMirrorHorizontal = ((await readIntProperty(layer[KEY_MIRROR], KEY_X, "Mirror X", tokens, tokenId)) == 1);
    const shouldMirrorVertical = ((await readIntProperty(layer[KEY_MIRROR], KEY_Y, "Mirror Y", tokens, tokenId)) == 1);

    layerImage.mirror(shouldMirrorHorizontal, shouldMirrorVertical);
  }

  let x = 0;
  let y = 0;

  if (KEY_ANCHOR in layer) {
    let anchorLayerId = layer[KEY_ANCHOR];

    if (typeof anchorLayerId === "object") {
      // TODO test this
      const anchorLayerIndex = await readIntProperty(layer, KEY_ANCHOR, "Anchor Layer Index", tokens, tokenId);
      anchorLayerId = layer[KEY_ANCHOR].options[anchorLayerIndex];
    }

    const anchorLayor = getLayerWithId(layout, anchorLayerId);

    console.log(`  Anchor Layer Id: ${anchorLayerId}`);

    x = anchorLayor.finalCenterX;
    y = anchorLayor.finalCenterY;
  }

  let relativeX = 0;
  let relativeY = 0;

  // position the layer (optionally)
  if (KEY_FIXED_POSITION in layer) {
    // Fixed position sets an absolute position
    x = await readIntProperty(layer[KEY_FIXED_POSITION], KEY_X, "Layer Fixed Position X", tokens, tokenId);
    y = await readIntProperty(layer[KEY_FIXED_POSITION], KEY_Y, "Layer Fixed Position Y", tokens, tokenId);
  } else {
    // relative position adjusts xy based on the anchor
    if (KEY_RELATIVE_POSITION in layer) {
      relativeX = await readIntProperty(layer[KEY_RELATIVE_POSITION], KEY_X, "Layer Relative Position X", tokens, tokenId);
      relativeY = await readIntProperty(layer[KEY_RELATIVE_POSITION], KEY_Y, "Layer Relative Position Y", tokens, tokenId);
    }

    // relative rotation orbits this layer around an anchor
    if (KEY_ORBIT_ROTATION in layer) {
      const relativeRotation = await readIntProperty(layer, KEY_ORBIT_ROTATION, "Layer Orbit Rotation", tokens, tokenId);

      console.log(`Orbiting ${relativeRotation} degrees around anchor`);

      const rad = -relativeRotation * Math.PI / 180;

      relativeX = Math.round(relativeX * Math.cos(rad) - relativeY * Math.sin(rad));
      relativeY = Math.round(relativeY * Math.cos(rad) + relativeX * Math.sin(rad));
    }

    x += relativeX;
    y += relativeY;
  }

  // stamp the final center X and Y that this layer was rendered at (for any follow-up layers that might be anchored here)
  layer.finalCenterX = x;
  layer.finalCenterY = y;
  layer.active = true; // set this to be true so that any subsequent layers that are anchored to this can tell which layer was active (for multi state layers)

  // offset x and y so that layers are drawn at the center of their image
  x -= (bitmapWidth / 2);
  y -= (bitmapHeight / 2);

  const compositeOptions = {};

  // adjust the color
  if (KEY_COLOR in layer) {
    if (KEY_RED in layer[KEY_COLOR]) {
      const red = await readIntProperty(layer[KEY_COLOR], KEY_RED, "Layer Color Red", tokens, tokenId);

      if (red != 0) {
        layerImage.color([
          {
            apply: 'red', params: [red]
          }
        ]);
      }
    }
    if (KEY_GREEN in layer[KEY_COLOR]) {
      const green = await readIntProperty(layer[KEY_COLOR], KEY_GREEN, "Layer Color Green", tokens, tokenId);

      if (green != 0) {
        layerImage.color([
          {
            apply: 'green', params: [green]
          }
        ]);
      }
    }
    if (KEY_BLUE in layer[KEY_COLOR]) {
      const blue = await readIntProperty(layer[KEY_COLOR], KEY_BLUE, "Layer Color Blue", tokens, tokenId);

      if (blue != 0) {
        layerImage.color([
          {
            apply: 'blue', params: [blue]
          }
        ]);
      }
    }
    if (KEY_HUE in layer[KEY_COLOR]) {
      const hue = await readIntProperty(layer[KEY_COLOR], KEY_HUE, "Layer Color Hue", tokens, tokenId);

      if (hue != 0) {
        layerImage.color([
          {
            apply: 'hue', params: [hue]
          }
        ]);
      }
    }
    if (KEY_BRIGHTNESS in layer[KEY_COLOR]) {
      const brightness = await readIntProperty(layer[KEY_COLOR], KEY_BRIGHTNESS, "Layer Color Brightness", tokens, tokenId);

      if (brightness != 0) {
        layerImage.brightness(brightness / 100);        
      }
    }
    if (KEY_SATURATION in layer[KEY_COLOR]) {
      const saturation = await readIntProperty(layer[KEY_COLOR], KEY_SATURATION, "Layer Color Saturation", tokens, tokenId);

      if (saturation != 0) {
        layerImage.color([
          {
            apply: 'saturate', params: [saturation]
          }
        ]);
      }
    }

    if (KEY_ALPHA in layer[KEY_COLOR]) {
      const alpha = await readIntProperty(layer[KEY_COLOR], KEY_ALPHA, "Layer Color Alpha", tokens, tokenId);

      if (alpha < 100) {
        layerImage.opacity(alpha / 100);
      }
    }

    if (KEY_MULTIPLY in layer[KEY_COLOR]) {
      const shouldMultiply = ((await readIntProperty(layer[KEY_COLOR], KEY_MULTIPLY, "Layer Color Should Multiply", tokens, tokenId)) > 0);

      if (shouldMultiply) {
        compositeOptions.mode = Jimp.BLEND_MULTIPLY;

        if (KEY_OPACITY in layer[KEY_COLOR]) {
          const opacity = await readIntProperty(layer[KEY_COLOR], KEY_OPACITY, "Layer Multiply Opacity", tokens, tokenId);

          compositeOptions.opacitySource = opacity / 100.0;
        }
      }
    }

    if (KEY_HARDLIGHT in layer[KEY_COLOR]) {
      const shouldHardlight = ((await readIntProperty(layer[KEY_COLOR], KEY_HARDLIGHT, "Layer Color Should Hardlight", tokens, tokenId)) > 0);

      if (shouldHardlight) {
        compositeOptions.mode = Jimp.BLEND_HARDLIGHT;

        if (KEY_OPACITY in layer[KEY_COLOR]) {
          const opacity = await readIntProperty(layer[KEY_COLOR], KEY_OPACITY, "Layer Hardlight Opacity", tokens, tokenId);

          compositeOptions.opacitySource = opacity / 100.0;
        }
      }
    }

    if (KEY_LIGHTEN in layer[KEY_COLOR]) {
      const shouldLighten = ((await readIntProperty(layer[KEY_COLOR], KEY_LIGHTEN, "Layer Color Should Lighten", tokens, tokenId)) > 0);

      if (shouldLighten) {
        compositeOptions.mode = Jimp.BLEND_LIGHTEN;

        if (KEY_OPACITY in layer[KEY_COLOR]) {
          const opacity = await readIntProperty(layer[KEY_COLOR], KEY_OPACITY, "Layer Lighten Opacity", tokens, tokenId);

          compositeOptions.opacitySource = opacity / 100.0;
        }
      }
    }

    if (KEY_OVERLAY in layer[KEY_COLOR]) {
      const shouldOverlay = ((await readIntProperty(layer[KEY_COLOR], KEY_OVERLAY, "Layer Color Should Overlay", tokens, tokenId)) > 0);

      if (shouldOverlay) {
        compositeOptions.mode = Jimp.BLEND_OVERLAY;

        if (KEY_OPACITY in layer[KEY_COLOR]) {
          const opacity = await readIntProperty(layer[KEY_COLOR], KEY_OPACITY, "Layer Overlay Opacity", tokens, tokenId);

          compositeOptions.opacitySource = opacity / 100.0;
        }
      }
    }
  }

  if (image != null) {
    // composite this layer onto the current image
    image.composite(layerImage, x, y, compositeOptions);

    return image;
  } else {
    layer.finalCenterX = bitmapWidth / 2;
    layer.finalCenterY = bitmapHeight / 2;

    return layerImage;
  }
}

exports.render = render;