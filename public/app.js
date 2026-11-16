"use strict";
// Temporary local tool for testing NCBA API endpoints.
// Everything persists to localStorage only (no backend storage).
var _a;
const VARS_KEY = "ncba_tester_vars";
const REQUESTS_KEY = "ncba_tester_requests";
const ACTIVE_ID_KEY = "ncba_tester_active_id";
function uid() {
    return Math.random().toString(36).slice(2, 10);
}
function loadVars() {
    const raw = localStorage.getItem(VARS_KEY);
    if (raw)
        return JSON.parse(raw);
    const defaults = [
        { key: "base_url", value: "", secret: false },
        { key: "user_id", value: "", secret: false },
        { key: "password", value: "", secret: true },
        { key: "auth_token", value: "", secret: true },
    ];
    saveVars(defaults);
    return defaults;
}
function saveVars(vars) {
    localStorage.setItem(VARS_KEY, JSON.stringify(vars));
}
function loadRequests() {
    const raw = localStorage.getItem(REQUESTS_KEY);
    if (raw)
        return JSON.parse(raw);
    const defaults = [
        {
            id: uid(),
            name: "New request",
            method: "GET",
            url: "{{base_url}}/",
            headers: [{ key: "Content-Type", value: "application/json" }],
            body: "",
        },
    ];
    saveRequests(defaults);
    return defaults;
}
function saveRequests(reqs) {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(reqs));
}
let vars = loadVars();
let requests = loadRequests();
let activeId = localStorage.getItem(ACTIVE_ID_KEY) || ((_a = requests[0]) === null || _a === void 0 ? void 0 : _a.id) || "";
// ---- DOM refs ----
const $ = (id) => document.getElementById(id);
const varsTableBody = document.querySelector("#varsTable tbody");
const addVarBtn = $("addVarBtn");
const requestListEl = $("requestList");
const newRequestBtn = $("newRequestBtn");
const methodEl = $("method");
const urlEl = $("url");
const sendBtn = $("sendBtn");
const requestNameEl = $("requestName");
const saveBtn = $("saveBtn");
const deleteBtn = $("deleteBtn");
const headersTableBody = document.querySelector("#headersTable tbody");
const addHeaderBtn = $("addHeaderBtn");
const bodyTextEl = $("bodyText");
const tabBtns = document.querySelectorAll(".tab-btn");
const headersTab = $("headersTab");
const bodyTab = $("bodyTab");
const respMetaEl = $("respMeta");
const responseHeadersEl = $("responseHeaders");
const responseBodyEl = $("responseBody");
const extractPathEl = $("extractPath");
const extractVarNameEl = $("extractVarName");
const extractBtn = $("extractBtn");
let lastResponseJson = null;
// ---- variable substitution ----
function substitute(input) {
    return input.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, name) => {
        const found = vars.find((v) => v.key === name);
        return found ? found.value : `{{${name}}}`;
    });
}
// ---- Variables panel ----
function renderVars() {
    varsTableBody.innerHTML = "";
    vars.forEach((v, idx) => {
        const tr = document.createElement("tr");
        const keyTd = document.createElement("td");
        const keyInput = document.createElement("input");
        keyInput.type = "text";
        keyInput.value = v.key;
        keyInput.addEventListener("change", () => {
            vars[idx].key = keyInput.value.trim();
            saveVars(vars);
        });
        keyTd.appendChild(keyInput);
        const valTd = document.createElement("td");
        const valInput = document.createElement("input");
        valInput.type = v.secret ? "password" : "text";
        valInput.value = v.value;
        valInput.addEventListener("input", () => {
            vars[idx].value = valInput.value;
            saveVars(vars);
        });
        valTd.appendChild(valInput);
        const secretTd = document.createElement("td");
        const secretCheckbox = document.createElement("input");
        secretCheckbox.type = "checkbox";
        secretCheckbox.checked = v.secret;
        secretCheckbox.addEventListener("change", () => {
            vars[idx].secret = secretCheckbox.checked;
            saveVars(vars);
            renderVars();
        });
        secretTd.appendChild(secretCheckbox);
        const delTd = document.createElement("td");
        const delBtn = document.createElement("button");
        delBtn.className = "icon-btn";
        delBtn.textContent = "✕";
        delBtn.addEventListener("click", () => {
            vars.splice(idx, 1);
            saveVars(vars);
            renderVars();
        });
        delTd.appendChild(delBtn);
        tr.append(keyTd, valTd, secretTd, delTd);
        varsTableBody.appendChild(tr);
    });
}
addVarBtn.addEventListener("click", () => {
    vars.push({ key: "", value: "", secret: false });
    saveVars(vars);
    renderVars();
});
// ---- Headers editor ----
function renderHeaders(headers) {
    headersTableBody.innerHTML = "";
    headers.forEach((h, idx) => {
        const tr = document.createElement("tr");
        const keyTd = document.createElement("td");
        const keyInput = document.createElement("input");
        keyInput.type = "text";
        keyInput.value = h.key;
        keyInput.addEventListener("input", () => (headers[idx].key = keyInput.value));
        keyTd.appendChild(keyInput);
        const valTd = document.createElement("td");
        const valInput = document.createElement("input");
        valInput.type = "text";
        valInput.value = h.value;
        valInput.addEventListener("input", () => (headers[idx].value = valInput.value));
        valTd.appendChild(valInput);
        const delTd = document.createElement("td");
        const delBtn = document.createElement("button");
        delBtn.className = "icon-btn";
        delBtn.textContent = "✕";
        delBtn.addEventListener("click", () => {
            headers.splice(idx, 1);
            renderHeaders(headers);
        });
        delTd.appendChild(delBtn);
        tr.append(keyTd, valTd, delTd);
        headersTableBody.appendChild(tr);
    });
}
function currentHeadersFromDom() {
    const rows = Array.from(headersTableBody.querySelectorAll("tr"));
    return rows
        .map((row) => {
        const inputs = row.querySelectorAll("input");
        return { key: inputs[0].value.trim(), value: inputs[1].value };
    })
        .filter((h) => h.key.length > 0);
}
addHeaderBtn.addEventListener("click", () => {
    const current = currentHeadersFromDom();
    current.push({ key: "", value: "" });
    renderHeaders(current);
});
// ---- Tabs ----
tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        tabBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const tab = btn.dataset.tab;
        headersTab.hidden = tab !== "headers";
        bodyTab.hidden = tab !== "body";
    });
});
// ---- Saved requests list ----
function renderRequestList() {
    requestListEl.innerHTML = "";
    requests.forEach((r) => {
        const li = document.createElement("li");
        li.className = r.id === activeId ? "active" : "";
        const methodTag = document.createElement("span");
        methodTag.className = "method-tag";
        methodTag.textContent = r.method;
        const name = document.createElement("span");
        name.textContent = r.name;
        name.style.flex = "1";
        li.append(methodTag, name);
        li.addEventListener("click", () => {
            activeId = r.id;
            localStorage.setItem(ACTIVE_ID_KEY, activeId);
            loadRequestIntoForm(r);
            renderRequestList();
        });
        requestListEl.appendChild(li);
    });
}
function loadRequestIntoForm(r) {
    requestNameEl.value = r.name;
    methodEl.value = r.method;
    urlEl.value = r.url;
    bodyTextEl.value = r.body;
    renderHeaders(r.headers.map((h) => (Object.assign({}, h))));
}
newRequestBtn.addEventListener("click", () => {
    const r = {
        id: uid(),
        name: "New request",
        method: "GET",
        url: "",
        headers: [{ key: "Content-Type", value: "application/json" }],
        body: "",
    };
    requests.push(r);
    saveRequests(requests);
    activeId = r.id;
    localStorage.setItem(ACTIVE_ID_KEY, activeId);
    loadRequestIntoForm(r);
    renderRequestList();
});
saveBtn.addEventListener("click", () => {
    let r = requests.find((req) => req.id === activeId);
    if (!r) {
        r = { id: uid(), name: "New request", method: "GET", url: "", headers: [], body: "" };
        requests.push(r);
        activeId = r.id;
    }
    r.name = requestNameEl.value.trim() || "Untitled";
    r.method = methodEl.value;
    r.url = urlEl.value;
    r.headers = currentHeadersFromDom();
    r.body = bodyTextEl.value;
    saveRequests(requests);
    localStorage.setItem(ACTIVE_ID_KEY, activeId);
    renderRequestList();
});
deleteBtn.addEventListener("click", () => {
    if (!activeId)
        return;
    requests = requests.filter((r) => r.id !== activeId);
    saveRequests(requests);
    if (requests.length > 0) {
        activeId = requests[0].id;
        loadRequestIntoForm(requests[0]);
    }
    else {
        activeId = "";
        loadRequestIntoForm({ id: "", name: "", method: "GET", url: "", headers: [], body: "" });
    }
    localStorage.setItem(ACTIVE_ID_KEY, activeId);
    renderRequestList();
});
// ---- Send request ----
async function sendRequest() {
    const method = methodEl.value;
    const url = substitute(urlEl.value.trim());
    const headerRows = currentHeadersFromDom();
    const headers = {};
    headerRows.forEach((h) => {
        if (h.key)
            headers[substitute(h.key)] = substitute(h.value);
    });
    const body = substitute(bodyTextEl.value);
    respMetaEl.textContent = "Sending...";
    responseBodyEl.textContent = "";
    responseHeadersEl.textContent = "";
    try {
        const res = await fetch("/api/proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ method, url, headers, body }),
        });
        const data = (await res.json());
        if (data.error) {
            respMetaEl.textContent = "Error";
            respMetaEl.className = "meta status-err";
            responseBodyEl.textContent = data.error;
            lastResponseJson = null;
            return;
        }
        const ok = data.status >= 200 && data.status < 300;
        respMetaEl.textContent = `${data.status} ${data.statusText} · ${data.elapsedMs}ms`;
        respMetaEl.className = `meta ${ok ? "status-ok" : "status-err"}`;
        responseHeadersEl.textContent = Object.entries(data.headers)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n");
        try {
            lastResponseJson = JSON.parse(data.body);
            responseBodyEl.textContent = JSON.stringify(lastResponseJson, null, 2);
        }
        catch (_a) {
            lastResponseJson = null;
            responseBodyEl.textContent = data.body;
        }
    }
    catch (err) {
        respMetaEl.textContent = "Network error";
        respMetaEl.className = "meta status-err";
        responseBodyEl.textContent = err instanceof Error ? err.message : String(err);
        lastResponseJson = null;
    }
}
sendBtn.addEventListener("click", sendRequest);
// ---- Extract response field into a variable ----
function getByPath(obj, path) {
    return path
        .split(".")
        .filter(Boolean)
        .reduce((acc, key) => {
        if (acc && typeof acc === "object" && key in acc) {
            return acc[key];
        }
        return undefined;
    }, obj);
}
extractBtn.addEventListener("click", () => {
    const path = extractPathEl.value.trim();
    const varName = extractVarNameEl.value.trim();
    if (!path || !varName)
        return;
    if (lastResponseJson === null) {
        alert("Response is not JSON, or no request has been sent yet.");
        return;
    }
    const value = getByPath(lastResponseJson, path);
    if (value === undefined) {
        alert(`No value found at path "${path}"`);
        return;
    }
    const existing = vars.find((v) => v.key === varName);
    const strValue = typeof value === "string" ? value : JSON.stringify(value);
    if (existing) {
        existing.value = strValue;
    }
    else {
        vars.push({ key: varName, value: strValue, secret: false });
    }
    saveVars(vars);
    renderVars();
    extractPathEl.value = "";
    extractVarNameEl.value = "";
});
// ---- init ----
renderVars();
renderRequestList();
const initial = requests.find((r) => r.id === activeId) || requests[0];
if (initial) {
    activeId = initial.id;
    loadRequestIntoForm(initial);
}
else {
    renderHeaders([]);
}
