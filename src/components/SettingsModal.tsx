import { useState } from 'react';
import { useStore, APIProfile } from '../store';
import { X, Plus, Trash2, Check, Plug, Shield } from 'lucide-react';

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const apiProfiles = useStore((state) => state.apiProfiles);
  const activeProfileId = useStore((state) => state.activeProfileId);
  const addProfile = useStore((state) => state.addProfile);
  const updateProfile = useStore((state) => state.updateProfile);
  const deleteProfile = useStore((state) => state.deleteProfile);
  const setActiveProfile = useStore((state) => state.setActiveProfile);

  const [editingId, setEditingId] = useState<string | null>(activeProfileId || apiProfiles[0]?.id || null);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const editingProfile = apiProfiles.find((p) => p.id === editingId);

  const handleTestConnection = async () => {
    if (!editingProfile) return;
    setTestStatus('testing');
    try {
      const response = await fetch(`${editingProfile.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${editingProfile.apiKey}`,
        },
      });
      if (response.ok) {
        setTestStatus('success');
      } else {
        // Try chat completion endpoint if models endpoint fails
        const chatResponse = await fetch(`${editingProfile.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${editingProfile.apiKey}`,
          },
          body: JSON.stringify({
            model: editingProfile.modelName,
            messages: [{ role: 'user', content: 'Hello' }],
            max_tokens: 1,
          }),
        });
        if (chatResponse.ok) {
          setTestStatus('success');
        } else {
          setTestStatus('error');
        }
      }
    } catch (error) {
      setTestStatus('error');
    }
    setTimeout(() => setTestStatus('idle'), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 font-sans">
      <div className="bg-[#FAF9F6] border border-[#E5E5E0] rounded-2xl shadow-2xl w-[600px] overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-[#E5E5E0] flex justify-between items-center bg-[#F2F2EC]">
          <h2 className="text-lg font-serif font-bold text-[#1A1A1A]">全局 API 配置</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[#E5E5E0] rounded-md transition-colors text-[#666]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 bg-[#EBEBE5] border-r border-[#E5E5E0] p-4 flex flex-col gap-2 overflow-y-auto">
            {apiProfiles.map((profile) => (
              <div
                key={profile.id}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                  editingId === profile.id ? 'bg-white shadow-sm border border-[#D5D5D0]' : 'hover:bg-[#E5E5E0] border border-transparent'
                }`}
                onClick={() => setEditingId(profile.id)}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeProfileId === profile.id ? 'bg-[#4B8A6E]' : 'bg-transparent'}`} />
                  <span className="text-sm text-[#333] truncate">{profile.name}</span>
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                if (apiProfiles.length >= 3) {
                  alert('最多支持保存 3 组配置');
                  return;
                }
                addProfile({ name: '新配置', baseUrl: '', apiKey: '', modelName: '' });
              }}
              className="flex items-center gap-2 p-2 text-sm text-[#666] hover:text-[#333] hover:bg-[#E5E5E0] rounded-lg transition-colors mt-2"
            >
              <Plus className="w-4 h-4" />
              添加配置
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto bg-white">
            {editingProfile ? (
              <div className="space-y-5">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-medium text-[#1A1A1A]">编辑配置</h3>
                  <div className="flex gap-2">
                    {activeProfileId !== editingProfile.id && (
                      <button
                        onClick={() => setActiveProfile(editingProfile.id)}
                        className="px-3 py-1.5 text-xs font-medium text-[#4B8A6E] bg-[#E8F3EE] hover:bg-[#DDF0E7] rounded-md transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        设为当前使用
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (apiProfiles.length === 1) {
                          alert('至少保留一组配置');
                          return;
                        }
                        deleteProfile(editingProfile.id);
                        setEditingId(apiProfiles.find(p => p.id !== editingProfile.id)?.id || null);
                      }}
                      className="p-1.5 text-[#E84C3D] hover:bg-[#FDECEA] rounded-md transition-colors"
                      title="删除配置"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5">配置名称</label>
                    <input
                      className="w-full bg-[#FAF9F6] border border-[#D5D5D0] rounded-lg px-3 py-2 text-sm text-[#333] outline-none focus:border-[#8B9D83]"
                      value={editingProfile.name}
                      onChange={(e) => updateProfile(editingProfile.id, { name: e.target.value })}
                      placeholder="例如：主力大模型"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5">API Base URL</label>
                    <input
                      className="w-full bg-[#FAF9F6] border border-[#D5D5D0] rounded-lg px-3 py-2 text-sm text-[#333] outline-none focus:border-[#8B9D83]"
                      value={editingProfile.baseUrl}
                      onChange={(e) => updateProfile(editingProfile.id, { baseUrl: e.target.value })}
                      placeholder="https://api.openai.com/v1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5">API Key</label>
                    <input
                      type="password"
                      className="w-full bg-[#FAF9F6] border border-[#D5D5D0] rounded-lg px-3 py-2 text-sm text-[#333] outline-none focus:border-[#8B9D83]"
                      value={editingProfile.apiKey}
                      onChange={(e) => updateProfile(editingProfile.id, { apiKey: e.target.value })}
                      placeholder="sk-..."
                    />
                    <div className="flex items-start gap-1.5 mt-2 text-xs text-[#888]">
                      <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[#8B9D83]" />
                      <span>API Key 仅保存在您的浏览器本地，不会上传到任何服务器。请勿在公共电脑上保存。</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5">Model Name</label>
                    <input
                      className="w-full bg-[#FAF9F6] border border-[#D5D5D0] rounded-lg px-3 py-2 text-sm text-[#333] outline-none focus:border-[#8B9D83]"
                      value={editingProfile.modelName}
                      onChange={(e) => updateProfile(editingProfile.id, { modelName: e.target.value })}
                      placeholder="gpt-4o / gemini-1.5-pro"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E5E5E0]">
                  <button
                    onClick={handleTestConnection}
                    disabled={testStatus === 'testing'}
                    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      testStatus === 'success' ? 'bg-[#E8F3EE] text-[#4B8A6E]' :
                      testStatus === 'error' ? 'bg-[#FDECEA] text-[#E84C3D]' :
                      'bg-[#F2F2EC] text-[#4A4A4A] hover:bg-[#E5E5E0]'
                    }`}
                  >
                    <Plug className="w-4 h-4" />
                    {testStatus === 'testing' ? '测试中...' :
                     testStatus === 'success' ? '连接成功' :
                     testStatus === 'error' ? '连接失败，请检查配置' :
                     '测试连接'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-[#A0A09C] text-sm">
                请选择或添加配置
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
