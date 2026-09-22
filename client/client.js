window.__ModuleLoader__.load({
  id: 'dsh-web-access-notifier',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") {
		for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) {
				__defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
		}
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let react = require("react");
react = __toESM(react);
let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
let zod = require("zod");

//#region typert.remote-client.js
const statusSchema = zod.z.object({
	serviceReady: zod.z.boolean(),
	webhookConfigured: zod.z.boolean(),
	lastAttemptAt: zod.z.string().nullable(),
	lastSuccessAt: zod.z.string().nullable(),
	lastErrorCode: zod.z.string().nullable(),
	tokenLength: zod.z.number().nullable()
});
const sendResultSchema = zod.z.object({
	ok: zod.z.literal(true),
	status: statusSchema
});
const configurationSchema = zod.z.object({
	enabled: zod.z.boolean(),
	hostName: zod.z.string(),
	publicOrigin: zod.z.string(),
	webhookUrl: zod.z.string()
});
const descriptor = (method, schema, typeSymbol) => ({
	id: `dsh-web-access-notifier#dsh-web-access-notifier/${method}`,
	service: "dshWebAccessNotifier",
	namespace: "dsh-web-access-notifier",
	method,
	invocation: { kind: "direct" },
	parameters: [],
	result: {
		mode: "strict",
		typeSymbol,
		schema
	},
	sourceLocation: {
		file: "host/index.js",
		line: 1,
		column: 1
	}
});
const TYPERT_REMOTE = {
	package: "dsh-web-access-notifier",
	descriptors: [
		descriptor("status", statusSchema, "dsh-web-access-notifier#NotifierStatus"),
		descriptor("configuration", configurationSchema, "dsh-web-access-notifier#NotifierConfiguration"),
		descriptor("send", sendResultSchema, "dsh-web-access-notifier#SendResult")
	]
};

//#endregion
//#region client/index.js
const SETTINGS_NAMESPACE = "dsh-web-access-notifier";
const FEISHU_WEBHOOK_REF = "feishuWebhookUrl";
const REMOTE_NAMESPACE = "dsh-web-access-notifier";
function unwrapRemote(result) {
	if (result?.ok === true) return result.value;
	if (result?.ok === false) throw result.error;
	throw new Error("Invalid DSH Remote response");
}
function Card({ scope, remote, credentials }) {
	const snapshot = scope.getSnapshot();
	const value = snapshot.value ?? {
		enabled: true,
		hostName: "",
		publicOrigin: ""
	};
	const [enabled, setEnabled] = (0, react.useState)(Boolean(value.enabled));
	const [hostName, setHostName] = (0, react.useState)(value.hostName ?? "");
	const [publicOrigin, setPublicOrigin] = (0, react.useState)(value.publicOrigin ?? "");
	const [webhook, setWebhook] = (0, react.useState)("");
	const [webhookConfigured, setWebhookConfigured] = (0, react.useState)(false);
	const [status, setStatus] = (0, react.useState)(null);
	const [open, setOpen] = (0, react.useState)(false);
	const [busy, setBusy] = (0, react.useState)(false);
	const [message, setMessage] = (0, react.useState)("");
	(0, react.useEffect)(() => scope.subscribe(() => {
		const next = scope.getSnapshot().value ?? {
			enabled: true,
			hostName: "",
			publicOrigin: ""
		};
		setEnabled(Boolean(next.enabled));
		setHostName(next.hostName ?? "");
		setPublicOrigin(next.publicOrigin ?? "");
	}), [scope]);
	(0, react.useEffect)(() => {
		let active = true;
		Promise.allSettled([
			remote.configuration().then(unwrapRemote),
			remote.status().then(unwrapRemote),
			credentials.describe([FEISHU_WEBHOOK_REF]).then(unwrapRemote)
		]).then(([configurationResult, statusResult, credentialResult]) => {
			if (!active) return;
			if (configurationResult.status === "fulfilled") {
				const configuration = configurationResult.value;
				setEnabled(Boolean(configuration.enabled));
				setHostName(configuration.hostName ?? "");
				setPublicOrigin(configuration.publicOrigin ?? "");
				setWebhook(configuration.webhookUrl ?? "");
				setWebhookConfigured(Boolean(configuration.webhookUrl));
			} else setMessage("插件 Host 尚未加载当前版本，请重启 DSH 后读取 Webhook 地址。");
			if (statusResult.status === "fulfilled") setStatus(statusResult.value);
			if (configurationResult.status === "rejected" && credentialResult.status === "fulfilled") setWebhookConfigured(Boolean(credentialResult.value[FEISHU_WEBHOOK_REF]?.configured));
			else if (configurationResult.status === "rejected" && statusResult.status === "fulfilled") setWebhookConfigured(Boolean(statusResult.value.webhookConfigured));
			if (statusResult.status === "rejected" && configurationResult.status === "fulfilled") setMessage(statusResult.reason?.message ?? "读取插件状态失败");
		});
		return () => {
			active = false;
		};
	}, [credentials, remote]);
	async function save() {
		setBusy(true);
		setMessage("");
		try {
			await scope.mutate([
				{
					op: "set",
					path: ["enabled"],
					value: enabled
				},
				{
					op: "set",
					path: ["hostName"],
					value: hostName.trim()
				},
				{
					op: "set",
					path: ["publicOrigin"],
					value: publicOrigin
				}
			], snapshot.revision);
			if (webhook.trim()) {
				unwrapRemote(await credentials.set(FEISHU_WEBHOOK_REF, webhook.trim()));
				setWebhook(webhook.trim());
				setWebhookConfigured(true);
			}
			let hostCurrent = true;
			try {
				const savedConfiguration = unwrapRemote(await remote.configuration());
				setHostName(savedConfiguration.hostName ?? "");
				setWebhook(savedConfiguration.webhookUrl ?? "");
				setWebhookConfigured(Boolean(savedConfiguration.webhookUrl));
			} catch {
				hostCurrent = false;
			}
			try {
				setStatus(unwrapRemote(await remote.status()));
			} catch {}
			setMessage(hostCurrent ? "配置已保存" : "配置已保存；请重启 DSH 以加载当前 Host 并读取 Webhook 地址。");
		} catch (error) {
			setMessage(error?.message ?? "保存失败");
		} finally {
			setBusy(false);
		}
	}
	async function sendNow() {
		setBusy(true);
		setMessage("");
		try {
			setStatus(unwrapRemote(await remote.send()).status);
			setMessage("已发送当前 Token");
		} catch (error) {
			setMessage(error?.message ?? "发送失败");
			try {
				setStatus(unwrapRemote(await remote.status()));
			} catch {}
		} finally {
			setBusy(false);
		}
	}
	const statusText = status?.serviceReady ? "ready" : "not ready";
	return react.default.createElement("div", { style: {
		border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.35))",
		background: open ? "var(--dsw-alias-bg-layer-2, rgba(127,127,127,0.10))" : "var(--dsw-alias-bg-layer-3, rgba(127,127,127,0.05))",
		borderRadius: 12,
		transition: "border-color .16s, background .16s"
	} }, react.default.createElement("button", {
		type: "button",
		"aria-expanded": open,
		onClick: () => setOpen(!open),
		style: {
			appearance: "none",
			width: "100%",
			font: "inherit",
			color: "inherit",
			textAlign: "left",
			cursor: "pointer",
			background: "none",
			border: 0,
			borderRadius: 12,
			display: "flex",
			alignItems: "center",
			gap: 12,
			padding: "14px 16px"
		}
	}, react.default.createElement("div", { style: {
		flex: 1,
		minWidth: 0
	} }, react.default.createElement("div", { style: {
		fontSize: 14,
		fontWeight: 600
	} }, "DSH Web Access Notifier"), react.default.createElement("div", { style: {
		color: "var(--dsw-alias-label-tertiary, rgba(127,127,127,0.8))",
		fontSize: 13,
		lineHeight: 1.5
	} }, "DSH Web 启动地址与飞书通知配置。")), react.default.createElement(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { style: {
		transform: open ? "rotate(180deg)" : "rotate(0deg)",
		transition: "transform .16s"
	} })), open ? react.default.createElement("div", { style: {
		display: "grid",
		gap: 16,
		margin: "0 16px",
		padding: "4px 0 16px"
	} }, react.default.createElement("div", { style: {
		display: "grid",
		gap: 4
	} }, react.default.createElement("div", null, `当前服务状态：${statusText}`), status && react.default.createElement("div", { style: {
		fontSize: 12,
		color: "var(--dsw-alias-label-tertiary, rgba(127,127,127,0.8))"
	} }, `最近成功：${status.lastSuccessAt ?? "暂无"}；错误：${status.lastErrorCode ?? "无"}`)), react.default.createElement("label", { style: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 16
	} }, react.default.createElement("span", null, "启用自动通知"), react.default.createElement(_deepseek_ai_dsh_client_ui_primitives.Switch, {
		checked: enabled,
		onChange: setEnabled,
		label: "启用自动通知",
		disabled: busy
	})), react.default.createElement("label", { style: {
		display: "grid",
		gap: 6
	} }, react.default.createElement("span", null, "主机名称"), react.default.createElement(_deepseek_ai_dsh_client_ui_primitives.Input, {
		type: "text",
		value: hostName,
		placeholder: "留空时自动使用启动机器名称",
		onChange: (event) => setHostName(event.target.value),
		autoComplete: "off",
		disabled: busy
	})), react.default.createElement("label", { style: {
		display: "grid",
		gap: 6
	} }, react.default.createElement("span", null, "Feishu Webhook"), react.default.createElement(_deepseek_ai_dsh_client_ui_primitives.Input, {
		type: "url",
		value: webhook,
		placeholder: "https://open.feishu.cn/open-apis/bot/v2/hook/...",
		onChange: (event) => setWebhook(event.target.value),
		autoComplete: "off",
		disabled: busy
	})), react.default.createElement("label", { style: {
		display: "grid",
		gap: 6
	} }, react.default.createElement("span", null, "外部访问地址"), react.default.createElement(_deepseek_ai_dsh_client_ui_primitives.Input, {
		type: "url",
		value: publicOrigin,
		placeholder: "https://dsh.example.com",
		onChange: (event) => setPublicOrigin(event.target.value),
		disabled: busy
	})), message && react.default.createElement("div", { role: "status" }, message), react.default.createElement("div", { style: {
		display: "flex",
		justifyContent: "flex-end",
		gap: 8,
		paddingTop: 4
	} }, react.default.createElement(_deepseek_ai_dsh_client_ui_primitives.Button, {
		variant: "outline",
		disabled: busy || !status?.serviceReady,
		onClick: sendNow
	}, "立即发送当前 Token"), react.default.createElement(_deepseek_ai_dsh_client_ui_primitives.Button, {
		variant: "primary",
		disabled: busy,
		onClick: save
	}, busy ? "处理中…" : "保存"))) : null);
}
const inject = ["remote"];
async function apply(ctx) {
	await ctx.remote.$mount(TYPERT_REMOTE);
	await ctx.inject([
		"slots",
		"settingsScope",
		"remote",
		"remote.credentials",
		"remote.dsh-web-access-notifier"
	], (scopeCtx) => {
		const scope = scopeCtx.settingsScope.bind({ namespace: SETTINGS_NAMESPACE });
		const remote = scopeCtx.remote[REMOTE_NAMESPACE];
		const credentials = scopeCtx.remote.credentials;
		scopeCtx.slots.inject("settings.plugin.item", () => scopeCtx.slots.register({
			name: "settings.plugin.item",
			key: SETTINGS_NAMESPACE,
			order: 100,
			inject: () => ({})
		}, (props) => react.default.createElement(Card, {
			...props,
			scope,
			remote,
			credentials
		})));
	});
}

//#endregion
exports.apply = apply;
exports.inject = inject;
    return module.exports;
  }
});
