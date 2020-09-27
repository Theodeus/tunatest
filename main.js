let output, tunaNode;
let nodeTypes = [];
let nodes = [];
// The AudioContext was not allowed to start. But I need it to create UI...
let context = new AudioContext();
let tuna = new Tuna(context);

function start() {
  const audioRadios = document.querySelectorAll("input[name='audio']");
  const selectedAudio = Array.from(audioRadios).filter((radio) => {
    return radio.checked;
  })[0].value;

  fetch(`audio/${selectedAudio}`)
    .then((res) => res.arrayBuffer())
    .then((buffer) => context.decodeAudioData(buffer))
    .then((buffer) => {
      let bufferSource = context.createBufferSource();
      bufferSource.buffer = buffer;
      bufferSource.loop = true;

      let input = context.createGain();
      output = context.createGain();
      let previousNode = input;

      nodes.forEach((tunaNode) => {
        previousNode.connect(tunaNode);
        previousNode = tunaNode;
      });

      bufferSource.connect(input);
      previousNode.connect(output);
      output.connect(context.destination);
      bufferSource.start(0);
    });
}

// Create UI controllers for each parameter
function initUI() {
  for (let nodeType in tuna) {
    if (tuna[nodeType].prototype.defaults) {
      nodeTypes.push(nodeType);
    }
  }
  nodeTypes.forEach((type) => {
    if (type === "Cabinet") {
      tunaNode = new tuna[type]({
        bypass: true,
        impulsePath: "audio/impulse_guitar.wav",
      });
    } else if (type === "Convolver") {
      tunaNode = new tuna[type]({
        bypass: true,
        impulse: "audio/ir_rev_short.wav",
      });
    } else if (type !== "LFO" && type !== "EnvelopeFollower") {
      tunaNode = new tuna[type]({ bypass: true });
    } else {
      return;
    }
    nodes.push(tunaNode);

    let div = document.getElementById("effects");
    let elem, control;
    let effectLabel = document.createElement("label");
    effectLabel.textContent = type;
    div.appendChild(effectLabel);
    for (let val in tunaNode.defaults) {
      control = document.createElement("div");
      if (tunaNode.defaults[val].type === "float") {
        elem = createFloatSlider(
          tunaNode,
          val,
          tunaNode.defaults[val].min || 0,
          tunaNode.defaults[val].max || tunaNode.defaults[val].value,
          tunaNode.defaults[val].value
        );
      } else if (tunaNode.defaults[val].type === "int") {
        elem = createIntSlider(
          tunaNode,
          val,
          tunaNode.defaults[val].min || 0,
          tunaNode.defaults[val].max || tunaNode.defaults[val].value,
          tunaNode.defaults[val].value
        );
      } else if (tunaNode.defaults[val].type === "boolean") {
        elem = createCheckbox(tunaNode, val, tunaNode[val]);
      } else if (tunaNode.defaults[val].type === "string") {
        elem = createStringInput(tunaNode, val, tunaNode.defaults[val].value);
      } else {
        console.error(
          "Unsupported param type",
          tunaNode,
          val,
          tunaNode.defaults[val]
        );
        continue;
      }
      elem.forEach((el) => control.appendChild(el));
      div.appendChild(control);
    }
    document.body.appendChild(div);
  });
}

// UI GENERATION
function createFloatSlider(node, name, min, max, val) {
  let sliderLabel = document.createElement("label");
  sliderLabel.textContent = name;
  let slider = document.createElement("input");
  slider.type = "range";
  slider.min = min;
  slider.max = max;
  slider.value = val;
  slider.step = (max - min) / 100;
  let valueLabel = document.createElement("span");
  valueLabel.innerText = val;
  slider.oninput = (_) => {
    node[name] = parseFloat(slider.value);
    valueLabel.innerText = slider.value;
  };

  if (node.defaults[name].automatable) {
    let button = document.createElement("button");
    let automating = false;
    let update = (_) => {
      if (automating) {
        requestAnimationFrame(update);
      }
      valueLabel.innerText = node[name].value;
    };
    button.innerText = "Automate";
    button.onclick = (_) => {
      automating = true;
      if (node[name].value !== min) {
        node.automate(name, min, 1000, 0);
      } else {
        node.automate(name, max, 1000, 0);
      }
      update();
      setTimeout((_) => (automating = false), 1100);
    };
    return [sliderLabel, valueLabel, slider, button];
  } else {
    console.log(
      "not automatable",
      typeof node[name],
      node[name] instanceof AudioParam ? name : "",
      node[name] instanceof AudioParam ? node : ""
    );
    return [sliderLabel, valueLabel, slider];
  }
}

function createIntSlider(node, name, min, max, val) {
  let sliderLabel = document.createElement("label");
  sliderLabel.textContent = name;
  let slider = document.createElement("input");
  slider.type = "range";
  slider.min = min;
  slider.max = max;
  slider.value = val;
  slider.step = 1;
  let valueLabel = document.createElement("span");
  valueLabel.innerText = val;
  slider.oninput = (_) => {
    node[name] = parseInt(slider.value);
    valueLabel.innerText = slider.value;
  };

  if (node.defaults[name].automatable) {
    let button = document.createElement("button");
    let automating = false;
    let update = (_) => {
      if (automating) {
        requestAnimationFrame(update);
      }
      valueLabel.innerText = node[name].value;
    };
    button.innerText = "Automate";
    button.onclick = (_) => {
      automating = true;
      if (node[name].value !== min) {
        node.automate(name, min, 1000, 0);
      } else {
        node.automate(name, max, 1000, 0);
      }
      update();
      setTimeout((_) => (automating = false), 1100);
    };
    return [sliderLabel, valueLabel, slider, button];
  } else {
    console.log(
      "not automatable",
      typeof node[name],
      node[name] instanceof AudioParam ? name : "",
      node[name] instanceof AudioParam ? node : ""
    );
    return [sliderLabel, valueLabel, slider];
  }
}

function createCheckbox(node, name, val) {
  const id = `${node.name}_${name}`;
  let boxLabel = document.createElement("label");
  boxLabel.textContent = name;
  boxLabel.htmlFor = id;
  let box = document.createElement("input");
  box.type = "checkbox";
  box.id = id;
  box.checked = val;
  box.onchange = (_) => (node[name] = box.checked);

  return [boxLabel, box];
}

function createStringInput(node, name, val) {
  let stringInputLabel = document.createElement("label");
  stringInputLabel.textContent = name;
  let stringInput = document.createElement("input");
  stringInput.value = val;
  stringInput.onchange = (_) => (node[name] = stringInput.value);

  return [stringInputLabel, stringInput];
}

initUI();
