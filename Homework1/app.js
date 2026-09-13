const CATEGORIES = {
  length: {
    label: "长度",
    hint: "以米为基准单位。",
    units: {
      km: { label: "千米", toBase: 1000 },
      m: { label: "米", toBase: 1 },
      cm: { label: "厘米", toBase: 0.01 },
      mm: { label: "毫米", toBase: 0.001 },
      mile: { label: "英里", toBase: 1609.344 },
      ft: { label: "英尺", toBase: 0.3048 },
      inch: { label: "英寸", toBase: 0.0254 },
    },
  },
  mass: {
    label: "质量",
    hint: "以千克为基准单位。",
    units: {
      t: { label: "吨", toBase: 1000 },
      kg: { label: "千克", toBase: 1 },
      g: { label: "克", toBase: 0.001 },
      lb: { label: "磅", toBase: 0.45359237 },
      oz: { label: "盎司", toBase: 0.028349523125 },
    },
  },
  temperature: {
    label: "温度",
    hint: "摄氏、华氏、开尔文之间换算。",
    units: {
      c: { label: "摄氏度" },
      f: { label: "华氏度" },
      k: { label: "开尔文" },
    },
  },
  volume: {
    label: "体积",
    hint: "以升为基准单位。",
    units: {
      m3: { label: "立方米", toBase: 1000 },
      l: { label: "升", toBase: 1 },
      ml: { label: "毫升", toBase: 0.001 },
      gal: { label: "美制加仑", toBase: 3.785411784 },
    },
  },
  time: {
    label: "时间",
    hint: "以秒为基准单位。",
    units: {
      d: { label: "天", toBase: 86400 },
      h: { label: "小时", toBase: 3600 },
      min: { label: "分钟", toBase: 60 },
      s: { label: "秒", toBase: 1 },
      ms: { label: "毫秒", toBase: 0.001 },
    },
  },
  data: {
    label: "数据量",
    hint: "按二进制换算（1 KB = 1024 B）。",
    units: {
      b: { label: "字节", toBase: 1 },
      kb: { label: "KB", toBase: 1024 },
      mb: { label: "MB", toBase: 1024 ** 2 },
      gb: { label: "GB", toBase: 1024 ** 3 },
    },
  },
};

const state = {
  category: "length",
};

const tabsEl = document.querySelector(".category-tabs");
const amountEl = document.querySelector("#amount");
const fromEl = document.querySelector("#from-unit");
const toEl = document.querySelector("#to-unit");
const resultEl = document.querySelector("#result .result-eq");
const formulaEl = document.querySelector("#formula");
const hintEl = document.querySelector("#category-hint");
const tableBodyEl = document.querySelector("#table-body");
const swapBtn = document.querySelector("#swap-btn");

function formatNumber(value) {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs !== 0 && abs < 1e-6) {
    return value.toExponential(4);
  }
  const nearestInt = Math.round(value);
  if (Math.abs(value - nearestInt) <= Math.max(abs * 1e-12, 1e-9)) {
    return nearestInt.toLocaleString("zh-CN");
  }
  return value.toLocaleString("zh-CN", {
    maximumFractionDigits: 8,
  });
}

function toCelsius(value, unit) {
  if (unit === "c") return value;
  if (unit === "f") return ((value - 32) * 5) / 9;
  return value - 273.15;
}

function fromCelsius(value, unit) {
  if (unit === "c") return value;
  if (unit === "f") return (value * 9) / 5 + 32;
  return value + 273.15;
}

function convert(amount, from, to, category) {
  if (category === "temperature") {
    return fromCelsius(toCelsius(amount, from), to);
  }
  const units = CATEGORIES[category].units;
  return (amount * units[from].toBase) / units[to].toBase;
}

function fillSelects() {
  const units = CATEGORIES[state.category].units;
  const keys = Object.keys(units);
  const currentFrom = fromEl.value;
  const currentTo = toEl.value;

  fromEl.innerHTML = "";
  toEl.innerHTML = "";
  for (const key of keys) {
    const fromOpt = document.createElement("option");
    fromOpt.value = key;
    fromOpt.textContent = units[key].label;
    fromEl.append(fromOpt);

    const toOpt = document.createElement("option");
    toOpt.value = key;
    toOpt.textContent = units[key].label;
    toEl.append(toOpt);
  }

  fromEl.value = keys.includes(currentFrom) ? currentFrom : keys[0];
  toEl.value = keys.includes(currentTo) && currentTo !== fromEl.value ? currentTo : keys[1] || keys[0];
}

function renderTabs() {
  tabsEl.innerHTML = "";
  for (const [id, meta] of Object.entries(CATEGORIES)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.role = "tab";
    btn.textContent = meta.label;
    btn.setAttribute("aria-selected", String(id === state.category));
    btn.addEventListener("click", () => {
      state.category = id;
      fillSelects();
      renderTabs();
      update();
    });
    tabsEl.append(btn);
  }
}

function update() {
  const amount = Number(amountEl.value);
  const from = fromEl.value;
  const to = toEl.value;
  const category = state.category;
  const meta = CATEGORIES[category];
  hintEl.textContent = meta.hint;

  if (!Number.isFinite(amount)) {
    resultEl.textContent = "请输入有效数字";
    formulaEl.textContent = "";
    tableBodyEl.innerHTML = "";
    return;
  }

  const converted = convert(amount, from, to, category);
  resultEl.textContent = `${formatNumber(amount)} ${meta.units[from].label} = ${formatNumber(converted)} ${meta.units[to].label}`;
  formulaEl.textContent =
    category === "temperature"
      ? "温度换算使用标准公式：C = (F − 32) × 5/9，K = C + 273.15。"
      : `先换算到基准单位，再转到目标单位。`;

  tableBodyEl.innerHTML = "";
  for (const [key, unit] of Object.entries(meta.units)) {
    const tr = document.createElement("tr");
    const name = document.createElement("td");
    const value = document.createElement("td");
    name.textContent = unit.label;
    value.textContent = formatNumber(convert(amount, from, key, category));
    tr.append(name, value);
    tableBodyEl.append(tr);
  }
}

swapBtn.addEventListener("click", () => {
  const tmp = fromEl.value;
  fromEl.value = toEl.value;
  toEl.value = tmp;
  update();
});

amountEl.addEventListener("input", update);
fromEl.addEventListener("change", update);
toEl.addEventListener("change", update);

renderTabs();
fillSelects();
update();
