const { contextBridge, ipcRenderer } = require('electron')

// 安全地暴露 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取后端端口
  getBackendPort: () => ipcRenderer.invoke('get-backend-port'),

  // 打开文件选择对话框
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),

  // 保存文件对话框（原生保存体验）
  saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),

  // 在 Finder/Explorer 中显示文件
  showInFolder: (filePath) => ipcRenderer.invoke('show-in-folder', filePath),

  // 判断是否在 Electron 环境中
  isElectron: true,
})
