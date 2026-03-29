import Foundation

/// 基于 GCD DispatchSource 的文件变化监听器
///
/// 监听指定文件的写入事件，CLI 修改 profiles.json 后自动通知 UI 刷新。
final class FileWatcher {
    private let path: String
    private let onChange: () -> Void
    private var source: DispatchSourceFileSystemObject?
    private var fileDescriptor: Int32 = -1

    /// 防抖间隔（秒）
    private let debounceInterval: TimeInterval = 0.3
    private var debounceWorkItem: DispatchWorkItem?

    init(path: String, onChange: @escaping () -> Void) {
        self.path = path
        self.onChange = onChange
    }

    deinit {
        stop()
    }

    /// 开始监听
    func start() {
        stop()

        // 确保文件存在
        guard FileManager.default.fileExists(atPath: path) else {
            // 文件不存在时稍后重试
            DispatchQueue.global().asyncAfter(deadline: .now() + 2) { [weak self] in
                self?.start()
            }
            return
        }

        fileDescriptor = open(path, O_EVTONLY)
        guard fileDescriptor >= 0 else { return }

        let source = DispatchSource.makeFileSystemObjectSource(
            fileDescriptor: fileDescriptor,
            eventMask: [.write, .rename, .delete],
            queue: .global(qos: .utility)
        )

        source.setEventHandler { [weak self] in
            guard let self else { return }

            // 防抖：多次快速写入只触发一次回调
            self.debounceWorkItem?.cancel()
            let workItem = DispatchWorkItem { [weak self] in
                self?.onChange()
            }
            self.debounceWorkItem = workItem
            DispatchQueue.main.asyncAfter(deadline: .now() + self.debounceInterval, execute: workItem)
        }

        source.setCancelHandler { [weak self] in
            guard let self else { return }
            if self.fileDescriptor >= 0 {
                close(self.fileDescriptor)
                self.fileDescriptor = -1
            }
        }

        source.resume()
        self.source = source
    }

    /// 停止监听
    func stop() {
        debounceWorkItem?.cancel()
        debounceWorkItem = nil
        source?.cancel()
        source = nil
    }
}
