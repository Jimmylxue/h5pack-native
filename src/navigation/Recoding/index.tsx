import {Alert, Pressable, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {
  start as startRecording,
  stop as stopRecording,
  cancel as cancelRecording,
  restart as restartRecording,
  onRecordingStart,
  onRecordingStop,
  onRecordingCancel,
} from '../../native/Recording';
export function Recording() {
  const [recording, setRecording] = useState(false);
  const [lastPath, setLastPath] = useState<string | null>(null);
  const [lastDuration, setLastDuration] = useState<number | null>(null);

  useEffect(() => {
    const subStart = onRecordingStart(({path}) => {
      setRecording(true);
      setLastPath(path);
    });
    const subStop = onRecordingStop(({path, durationMs}) => {
      setRecording(false);
      setLastPath(path);
      setLastDuration(durationMs);
    });
    const subCancel = onRecordingCancel(() => {
      setRecording(false);
      setLastDuration(null);
    });
    return () => {
      subStart.remove();
      subStop.remove();
      subCancel.remove();
    };
  }, []);

  const onStart = async () => {
    try {
      await startRecording({});
    } catch (e: any) {
      Alert.alert('开始录音失败', e?.message ?? String(e));
    }
  };

  const onStop = async () => {
    try {
      const res = await stopRecording();
      setLastPath(res.path);
      setLastDuration(res.durationMs);
    } catch (e: any) {
      Alert.alert('结束录音失败', e?.message ?? String(e));
    }
  };

  const onCancel = async () => {
    try {
      await cancelRecording();
    } catch (e: any) {
      Alert.alert('取消录音失败', e?.message ?? String(e));
    }
  };

  const onRestart = async () => {
    try {
      await restartRecording({});
    } catch (e: any) {
      Alert.alert('重新录音失败', e?.message ?? String(e));
    }
  };
  return (
    <>
      <View style={{flexDirection: 'row', padding: 12, gap: 12}}>
        <Pressable
          onPress={onStart}
          style={{
            backgroundColor: recording ? '#ccc' : '#4caf50',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 6,
          }}
          disabled={recording}>
          <Text style={{color: '#fff'}}>开始录音</Text>
        </Pressable>
        <Pressable
          onPress={onStop}
          style={{
            backgroundColor: recording ? '#f44336' : '#999',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 6,
          }}
          disabled={!recording}>
          <Text style={{color: '#fff'}}>结束录音</Text>
        </Pressable>
        <Pressable
          onPress={onCancel}
          style={{
            backgroundColor: '#ff9800',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 6,
          }}
          disabled={!recording}>
          <Text style={{color: '#fff'}}>取消录音</Text>
        </Pressable>
        <Pressable
          onPress={onRestart}
          style={{
            backgroundColor: '#3f51b5',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 6,
          }}>
          <Text style={{color: '#fff'}}>重新录音</Text>
        </Pressable>
      </View>
      {lastPath ? (
        <View style={{paddingHorizontal: 12, paddingBottom: 12}}>
          <Text style={{fontSize: 12}}>
            最近录音: {lastPath}{' '}
            {lastDuration ? `(${Math.round(lastDuration)}ms)` : ''}
          </Text>
        </View>
      ) : null}
    </>
  );
}
