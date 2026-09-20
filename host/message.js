export function resolveHostName(configuredHostName, defaultHostName) {
  return String(configuredHostName ?? '').trim() || String(defaultHostName ?? '').trim() || 'unknown-host'
}

export function buildNotificationText({ hostName, url, type = 'manual', date = new Date() }) {
  return `🔐 DSH Web 访问地址已更新\n\n主机名称：${hostName}\n访问地址：\n${url}\n\n更新时间：${date.toLocaleString('zh-CN', { timeZoneName: 'short' })}\n通知类型：${type === 'auto' ? '自动启动通知' : '手动发送'}`
}
