import React, {useCallback, useEffect, useState} from 'react';
import {
  DeviceEventEmitter,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BridgeLogEntry,
  clearLogs,
  getLogs,
} from '../../core/H5PackBridge/logger';

export function BridgeDebugPanel() {
  const [visible, setVisible] = useState(false);
  const [logs, setLogs] = useState<BridgeLogEntry[]>([]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('BRIDGE_LOG_UPDATE', () => {
      setLogs([...getLogs()]);
    });
    return () => sub.remove();
  }, []);

  const toggle = useCallback(() => setVisible(v => !v), []);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
  };

  return (
    <>
      {/* 悬浮按钮 */}
      <TouchableOpacity style={styles.fab} onPress={toggle}>
        <Text style={styles.fabText}>B</Text>
      </TouchableOpacity>

      {/* 日志面板 */}
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.panel}>
            {/* 顶栏 */}
            <View style={styles.header}>
              <Text style={styles.title}>Bridge Logs ({logs.length})</Text>
              <View style={styles.headerBtns}>
                <Pressable
                  style={styles.headerBtn}
                  onPress={() => {
                    clearLogs();
                    setLogs([]);
                  }}>
                  <Text style={styles.headerBtnText}>清空</Text>
                </Pressable>
                <Pressable style={styles.headerBtn} onPress={toggle}>
                  <Text style={styles.headerBtnText}>关闭</Text>
                </Pressable>
              </View>
            </View>

            {/* 日志列表 */}
            <ScrollView style={styles.logList}>
              {logs.length === 0 && (
                <Text style={styles.empty}>暂无日志，操作 H5 页面后会自动记录</Text>
              )}
              {logs.map((log, i) => (
                <LogItem key={log.id + '-' + i} log={log} formatTime={formatTime} />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function LogItem({log, formatTime}: {log: BridgeLogEntry; formatTime: (ts: number) => string}) {
  const [expanded, setExpanded] = useState(false);
  const isError = !!log.error;
  const isResponse = log.direction === '←';

  return (
    <Pressable style={[styles.logItem, isError && styles.logItemError]} onPress={() => setExpanded(!expanded)}>
      {/* 行1：时间 + 方向 + 模块.动作 + 耗时 */}
      <View style={styles.logRow1}>
        <Text style={styles.logTime}>{formatTime(log.timestamp)}</Text>
        <Text style={[styles.logDir, isResponse && styles.logDirRes]}>{log.direction}</Text>
        <Text style={[styles.logModule, isError && styles.logModuleError]}>
          {log.module}.{log.action}
        </Text>
        {isResponse && log.duration !== undefined && (
          <Text style={styles.logDuration}>{log.duration}ms</Text>
        )}
        {isError && <Text style={styles.logErrorTag}>ERROR</Text>}
      </View>

      {/* 展开详情 */}
      {expanded && (
        <View style={styles.logDetail}>
          {log.params && (
            <View>
              <Text style={styles.detailLabel}>参数:</Text>
              <Text style={styles.detailValue}>{JSON.stringify(log.params, null, 2)}</Text>
            </View>
          )}
          {log.result !== undefined && (
            <View>
              <Text style={styles.detailLabel}>返回:</Text>
              <Text style={styles.detailValue}>{typeof log.result === 'string' ? log.result : JSON.stringify(log.result, null, 2)}</Text>
            </View>
          )}
          {log.error && (
            <View>
              <Text style={styles.detailLabel}>错误:</Text>
              <Text style={[styles.detailValue, styles.errorText]}>
                [{log.error.code}] {log.error.message}
              </Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  panel: {
    flex: 1,
    marginTop: 60,
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  headerBtns: {
    flexDirection: 'row',
    gap: 12,
  },
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#333',
    borderRadius: 4,
  },
  headerBtnText: {
    color: '#aaa',
    fontSize: 13,
  },
  logList: {
    flex: 1,
  },
  empty: {
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 13,
  },
  logItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2a2a',
  },
  logItemError: {
    backgroundColor: 'rgba(255,59,48,0.08)',
  },
  logRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logTime: {
    color: '#666',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  logDir: {
    color: '#4f8ef7',
    fontSize: 13,
    fontWeight: '600',
  },
  logDirRes: {
    color: '#34c759',
  },
  logModule: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  logModuleError: {
    color: '#ff3b30',
  },
  logDuration: {
    color: '#888',
    fontSize: 11,
    marginLeft: 'auto',
  },
  logErrorTag: {
    color: '#ff3b30',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  logDetail: {
    marginTop: 6,
    paddingLeft: 8,
    gap: 4,
  },
  detailLabel: {
    color: '#888',
    fontSize: 11,
  },
  detailValue: {
    color: '#ccc',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  errorText: {
    color: '#ff3b30',
  },
});
