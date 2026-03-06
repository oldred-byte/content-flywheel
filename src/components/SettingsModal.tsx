import { useState, useEffect, useRef } from 'react';
import { useStore, APIProfile, ApiFormat, ModelConfig } from '../store';
import { X, Plus, Trash2, Check, Plug, Shield, Server, Cpu, Settings2, AlertCircle, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const API_FORMAT_OPTIONS: { value: ApiFormat; label: string; desc: string }[] = [
  { value: 'openai', label: 'OpenAI 格式', desc: 'OpenAI、Gemini(OpenAI兼容)、Kimi、Claude(OpenAI兼容)' },
  { value: 'anthropic', label: 'Anthropic 格式', desc: 'Claude 原生 API' },
  { value: 'gemini', label: 'Gemini 原生格式', desc: 'Google Gemini 原生 API' },
  { value: 'custom', label: '自定义格式', desc: '其他自定义 API 格式' },
];

// 预设供应商配置 - 已验证的准确配置
const ALL_PRESET_PROVIDERS = [
  {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiFormat: 'openai' as ApiFormat,
    models: [
      { name: 'GPT-4o', modelId: 'gpt-4o' },
      { name: 'GPT-4o Mini', modelId: 'gpt-4o-mini' },
      { name: 'GPT-4 Turbo', modelId: 'gpt-4-turbo-preview' },
      { name: 'GPT-3.5 Turbo', modelId: 'gpt-3.5-turbo' },
    ],
  },
  {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    apiFormat: 'openai' as ApiFormat,
    models: [
      { name: 'DeepSeek Chat', modelId: 'deepseek-chat' },
      { name: 'DeepSeek Reasoner', modelId: 'deepseek-reasoner' },
    ],
  },
  {
    name: 'Kimi (月之暗面)',
    baseUrl: 'https://api.moonshot.cn/v1',
    apiFormat: 'openai' as ApiFormat,
    models: [
      { name: 'Kimi K2', modelId: 'kimi-k2-0711-preview' },
      { name: 'Kimi 1.5', modelId: 'kimi-k1.5-32k-preview' },
      { name: 'Kimi 长思考', modelId: 'kimi-k1.5-32k-vision-preview' },
    ],
  },
  {
    name: '通义千问 (阿里云)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiFormat: 'openai' as ApiFormat,
    models: [
      { name: 'Qwen Max', modelId: 'qwen-max' },
      { name: 'Qwen Plus', modelId: 'qwen-plus' },
      { name: 'Qwen Turbo', modelId: 'qwen-turbo' },
    ],
  },
  {
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiFormat: 'openai' as ApiFormat,
    models: [
      { name: 'GLM-4', modelId: 'glm-4' },
      { name: 'GLM-4-Air', modelId: 'glm-4-air' },
      { name: 'GLM-4-Flash', modelId: 'glm-4-flash' },
    ],
  },
  {
    name: 'Claude (Anthropic)',
    baseUrl: 'https://api.anthropic.com/v1',
    apiFormat: 'anthropic' as ApiFormat,
    models: [
      { name: 'Claude 3.5 Sonnet', modelId: 'claude-3-5-sonnet-20241022' },
      { name: 'Claude 3.5 Haiku', modelId: 'claude-3-5-haiku-20241022' },
      { name: 'Claude 3 Opus', modelId: 'claude-3-opus-20240229' },
    ],
  },
  {
    name: 'Gemini (OpenAI兼容)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiFormat: 'openai' as ApiFormat,
    models: [
      { name: 'Gemini 2.0 Flash', modelId: 'gemini-2.0-flash-exp' },
      { name: 'Gemini 1.5 Flash', modelId: 'gemini-1.5-flash' },
      { name: 'Gemini 1.5 Pro', modelId: 'gemini-1.5-pro' },
    ],
  },
  {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiFormat: 'openai' as ApiFormat,
    models: [
      { name: 'Gemini 2.0 Flash (免费)', modelId: 'google/gemini-2.0-flash-exp:free' },
      { name: 'Claude 3.5 Sonnet', modelId: 'anthropic/claude-3.5-sonnet' },
      { name: 'GPT-4o', modelId: 'openai/gpt-4o' },
    ],
  },
];

// 排查指南内容组件
function TroubleshootingGuide({ apiFormat, baseUrl }: { apiFormat: ApiFormat; baseUrl: string }) {
  const getProviderName = () => {
    if (baseUrl.includes('deepseek')) return 'deepseek';
    if (baseUrl.includes('moonshot')) return 'kimi';
    if (baseUrl.includes('dashscope')) return 'qwen';
    if (baseUrl.includes('bigmodel')) return 'glm';
    if (baseUrl.includes('anthropic')) return 'claude';
    if (baseUrl.includes('google') || baseUrl.includes('generativelanguage')) return 'gemini';
    if (baseUrl.includes('openrouter')) return 'openrouter';
    if (baseUrl.includes('openai.com')) return 'openai';
    return 'generic';
  };

  const provider = getProviderName();

  const guides: Record<string, { title: string; items: string[] }> = {
    deepseek: {
      title: 'DeepSeek 常见问题',
      items: [
        'API Key 格式应为 sk- 开头，从 https://platform.deepseek.com/api_keys 获取',
        '新注册账号可能需要等待 5-10 分钟才能使用 API',
        '免费额度用完后需要充值才能继续使用',
        'reasoner 模型可能有较长的思考时间，请耐心等待',
      ],
    },
    kimi: {
      title: 'Kimi (月之暗面) 常见问题',
      items: [
        'API Key 从 https://platform.moonshot.cn/console/api-keys 获取',
        '新账号有免费额度，但需要实名认证',
        '如果遇到 429 错误，表示请求太频繁，请稍后再试',
        '长思考模型 (vision-preview) 仅支持特定场景',
      ],
    },
    qwen: {
      title: '通义千问 (阿里云) 常见问题',
      items: [
        'API Key 从 https://dashscope.console.aliyun.com/apiKey 获取',
        '需要阿里云账号，新用户有免费额度',
        '注意选择 "兼容 OpenAI" 模式，端点必须是 /compatible-mode/v1',
        '部分模型可能需要申请开通权限',
      ],
    },
    glm: {
      title: '智谱 GLM 常见问题',
      items: [
        'API Key 从 https://open.bigmodel.cn/usercenter/apikeys 获取',
        '需要实名认证才能获得 API 权限',
        '新用户有免费额度，足够个人使用',
        '如果遇到 401 错误，请检查 API Key 是否正确复制（不要有多余空格）',
      ],
    },
    claude: {
      title: 'Claude (Anthropic) 常见问题',
      items: [
        'Anthropic 不对中国大陆开放，需要使用海外手机号注册',
        'API Key 从 https://console.anthropic.com/settings/keys 获取',
        '需要绑定信用卡才能使用 API',
        'baseUrl 必须包含 /v1，如 https://api.anthropic.com/v1',
      ],
    },
    gemini: {
      title: 'Gemini 常见问题',
      items: [
        'API Key 从 https://aistudio.google.com/app/apikey 获取',
        '国内网络访问可能需要开启代理',
        'Gemini 在中国大陆和香港地区受限，建议使用美国 IP',
        '如果使用原生格式，API Key 要放在 URL 参数中（程序已自动处理）',
        '使用 OpenAI 兼容模式时，baseUrl 必须包含 /openai',
      ],
    },
    openrouter: {
      title: 'OpenRouter 常见问题',
      items: [
        'API Key 从 https://openrouter.ai/keys 获取',
        '支持支付宝充值，比较方便',
        '免费模型会有速率限制，建议购买额度',
        '模型 ID 格式为 "提供商/模型名"，如 google/gemini-2.0-flash-exp',
      ],
    },
    openai: {
      title: 'OpenAI 常见问题',
      items: [
        'OpenAI 不对中国大陆开放，需要海外手机号注册',
        'API Key 从 https://platform.openai.com/api-keys 获取',
        '需要绑定海外信用卡才能使用 API',
        '国内网络访问需要开启代理',
      ],
    },
    generic: {
      title: '通用排查建议',
      items: [
        '检查 API Key 是否正确复制，不要有前后空格',
        '检查 Base URL 是否完整，通常需要以 /v1 结尾',
        '确认 API Key 是否有足够余额或免费额度',
        '如果是国内厂商，确认是否已完成实名认证',
        '检查网络连接，部分服务需要代理才能访问',
        '确认选择的 API 格式与实际服务商匹配',
      ],
    },
  };

  const currentGuide = guides[provider] || guides.generic;

  return (
    <div className="mt-3 p-3 bg-[#FEF9E7] border border-[#F5D98E] rounded-lg">
      <div className="flex items-start gap-2">
        <HelpCircle className="w-4 h-4 text-[#D4A017] flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-[#8B6914] mb-2">{currentGuide.title}</p>
          <ul className="text-xs text-[#8B6914] space-y-1 list-disc list-inside">
            {currentGuide.items.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const apiProfiles = useStore((state) => state.apiProfiles);
  const activeProfileId = useStore((state) => state.activeProfileId);
  const addProfile = useStore((state) => state.addProfile);
  const updateProfile = useStore((state) => state.updateProfile);
  const deleteProfile = useStore((state) => state.deleteProfile);
  const setActiveProfile = useStore((state) => state.setActiveProfile);

  const [editingId, setEditingId] = useState<string | null>(activeProfileId || apiProfiles[0]?.id || null);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'models'>('basic');
  const [hiddenPresets, setHiddenPresets] = useState<string[]>(() => {
    const saved = localStorage.getItem('api-hidden-presets');
    return saved ? JSON.parse(saved) : [];
  });
  const prevProfilesCount = useRef(apiProfiles.length);

  // 过滤掉用户隐藏的预设
  const visiblePresets = ALL_PRESET_PROVIDERS.filter(p => !hiddenPresets.includes(p.name));

  const handleHidePreset = (presetName: string) => {
    const newHidden = [...hiddenPresets, presetName];
    setHiddenPresets(newHidden);
    localStorage.setItem('api-hidden-presets', JSON.stringify(newHidden));
  };

  const handleRestorePresets = () => {
    setHiddenPresets([]);
    localStorage.removeItem('api-hidden-presets');
  };

  // 当添加新配置时，自动切换到最新的配置
  useEffect(() => {
    if (apiProfiles.length > prevProfilesCount.current) {
      // 新配置已添加，切换到最新的
      const newProfile = apiProfiles[apiProfiles.length - 1];
      setEditingId(newProfile.id);
    }
    prevProfilesCount.current = apiProfiles.length;
  }, [apiProfiles]);

  const editingProfile = apiProfiles.find((p) => p.id === editingId);

  const handleAddPreset = (preset: typeof ALL_PRESET_PROVIDERS[0]) => {
    if (apiProfiles.length >= 5) {
      alert('最多支持保存 5 组配置');
      return;
    }
    const models: ModelConfig[] = preset.models.map((m, i) => ({
      id: uuidv4(),
      name: m.name,
      modelId: m.modelId,
      isDefault: i === 0,
    }));
    addProfile({
      name: preset.name,
      baseUrl: preset.baseUrl,
      apiKey: '',
      apiFormat: preset.apiFormat,
      models,
      defaultModelId: models[0]?.modelId,
    });
    // 显示提示引导用户填写 API Key
    setTimeout(() => {
      alert(`已添加 "${preset.name}" 预设配置。\n\n请填写您的 API Key 并点击"测试连接"。`);
    }, 100);
  };

  const handleTestConnection = async () => {
    if (!editingProfile || !editingProfile.defaultModelId) return;
    setTestStatus('testing');
    try {
      const defaultModel = editingProfile.models.find(m => m.modelId === editingProfile.defaultModelId);
      const modelId = defaultModel?.modelId || editingProfile.models[0]?.modelId;

      let response;

      if (editingProfile.apiFormat === 'anthropic') {
        // Anthropic 格式
        response = await fetch(`${editingProfile.baseUrl}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': editingProfile.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: 'user', content: 'Hello' }],
            max_tokens: 1,
          }),
        });
      } else if (editingProfile.apiFormat === 'gemini') {
        // Gemini 原生格式
        response = await fetch(
          `${editingProfile.baseUrl}/models/${modelId}:generateContent?key=${editingProfile.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Hello' }] }],
            }),
          }
        );
      } else {
        // OpenAI 格式（包括兼容端点）
        response = await fetch(`${editingProfile.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${editingProfile.apiKey}`,
          },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: 'user', content: 'Hello' }],
            max_tokens: 1,
          }),
        });
      }

      if (response.ok) {
        setTestStatus('success');
        setShowTroubleshooting(false);
        // 成功后3秒恢复状态
        setTimeout(() => setTestStatus('idle'), 3000);
      } else {
        setTestStatus('error');
        setShowTroubleshooting(true);
        // 失败后不清除状态，让用户有时间查看排查指南
      }
    } catch (error) {
      setTestStatus('error');
      setShowTroubleshooting(true);
      // 失败后不清除状态，让用户有时间查看排查指南
    }
  };

  const handleAddModel = () => {
    if (!editingProfile) return;
    const newModel: ModelConfig = {
      id: uuidv4(),
      name: '新模型',
      modelId: 'model-id',
      isDefault: editingProfile.models.length === 0,
    };
    updateProfile(editingProfile.id, {
      models: [...editingProfile.models, newModel],
    });
  };

  const handleUpdateModel = (modelId: string, updates: Partial<ModelConfig>) => {
    if (!editingProfile) return;
    updateProfile(editingProfile.id, {
      models: editingProfile.models.map((m) =>
        m.id === modelId ? { ...m, ...updates } : m
      ),
    });
  };

  const handleDeleteModel = (modelId: string) => {
    if (!editingProfile) return;
    if (editingProfile.models.length <= 1) {
      alert('至少保留一个模型');
      return;
    }
    const newModels = editingProfile.models.filter((m) => m.id !== modelId);
    // 如果删除的是默认模型，设置第一个为默认
    if (editingProfile.defaultModelId === modelId && newModels.length > 0) {
      newModels[0].isDefault = true;
      updateProfile(editingProfile.id, {
        models: newModels,
        defaultModelId: newModels[0].modelId,
      });
    } else {
      updateProfile(editingProfile.id, { models: newModels });
    }
  };

  const handleSetDefaultModel = (modelId: string) => {
    if (!editingProfile) return;
    updateProfile(editingProfile.id, {
      models: editingProfile.models.map((m) => ({
        ...m,
        isDefault: m.modelId === modelId,
      })),
      defaultModelId: modelId,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 font-sans">
      <div className="bg-[#FAF9F6] border border-[#E5E5E0] rounded-2xl shadow-2xl w-[700px] overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-[#E5E5E0] flex justify-between items-center bg-[#F2F2EC]">
          <h2 className="text-lg font-serif font-bold text-[#1A1A1A]">API 配置管理</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[#E5E5E0] rounded-md transition-colors text-[#666]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-52 bg-[#EBEBE5] border-r border-[#E5E5E0] p-4 flex flex-col gap-2 overflow-y-auto">
            {apiProfiles.map((profile) => (
              <div
                key={profile.id}
                className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                  editingId === profile.id ? 'bg-white shadow-sm border border-[#D5D5D0]' : 'hover:bg-[#E5E5E0] border border-transparent'
                }`}
                onClick={() => setEditingId(profile.id)}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeProfileId === profile.id ? 'bg-[#4B8A6E]' : 'bg-transparent'}`} />
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm text-[#333] truncate font-medium">{profile.name}</span>
                    <span className="text-xs text-[#888] truncate">{profile.apiFormat === 'openai' ? 'OpenAI' : profile.apiFormat}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* 快速预设 */}
            <div className="mt-4 pt-4 border-t border-[#D5D5D0]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#888] flex items-center gap-1">
                  <Server className="w-3 h-3" />
                  快速添加供应商
                </p>
                {hiddenPresets.length > 0 && (
                  <button
                    onClick={handleRestorePresets}
                    className="text-[10px] text-[#4B8A6E] hover:underline"
                  >
                    恢复默认
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {visiblePresets.map((preset) => (
                  <div
                    key={preset.name}
                    className="flex items-center justify-between group"
                  >
                    <button
                      onClick={() => handleAddPreset(preset)}
                      className="flex-1 text-left px-2 py-1.5 text-xs text-[#666] hover:bg-[#E5E5E0] rounded transition-colors truncate"
                    >
                      + {preset.name}
                    </button>
                    <button
                      onClick={() => handleHidePreset(preset.name)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#999] hover:text-[#666] hover:bg-[#E5E5E0] rounded transition-all"
                      title="从列表中隐藏"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    if (apiProfiles.length >= 5) {
                      alert('最多支持保存 5 组配置');
                      return;
                    }
                    addProfile({
                      name: '自定义',
                      baseUrl: '',
                      apiKey: '',
                      apiFormat: 'openai',
                      models: [{ id: uuidv4(), name: '默认模型', modelId: 'model', isDefault: true }],
                      defaultModelId: 'model',
                    });
                  }}
                  className="text-left px-2 py-1.5 text-xs text-[#666] hover:bg-[#E5E5E0] rounded transition-colors"
                >
                  + 自定义配置
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {editingProfile ? (
              <>
                {/* Tabs */}
                <div className="flex border-b border-[#E5E5E0] bg-[#FAF9F6]">
                  <button
                    onClick={() => setActiveTab('basic')}
                    className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                      activeTab === 'basic' ? 'text-[#1A1A1A]' : 'text-[#888] hover:text-[#666]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Settings2 className="w-4 h-4" />
                      基础配置
                    </span>
                    {activeTab === 'basic' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4B8A6E]" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('models')}
                    className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                      activeTab === 'models' ? 'text-[#1A1A1A]' : 'text-[#888] hover:text-[#666]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-4 h-4" />
                      模型列表 ({editingProfile.models.length})
                    </span>
                    {activeTab === 'models' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4B8A6E]" />
                    )}
                  </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {activeTab === 'basic' ? (
                    <div className="space-y-5">
                      <div className="flex justify-between items-center">
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
                          <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5">供应商名称</label>
                          <input
                            className="w-full bg-[#FAF9F6] border border-[#D5D5D0] rounded-lg px-3 py-2 text-sm text-[#333] outline-none focus:border-[#8B9D83]"
                            value={editingProfile.name}
                            onChange={(e) => updateProfile(editingProfile.id, { name: e.target.value })}
                            placeholder="例如：我的 OpenAI"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5">API 格式</label>
                          <select
                            className="w-full bg-[#FAF9F6] border border-[#D5D5D0] rounded-lg px-3 py-2 text-sm text-[#333] outline-none focus:border-[#8B9D83]"
                            value={editingProfile.apiFormat}
                            onChange={(e) => updateProfile(editingProfile.id, { apiFormat: e.target.value as ApiFormat })}
                          >
                            {API_FORMAT_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <p className="mt-1 text-xs text-[#888]">
                            {API_FORMAT_OPTIONS.find(o => o.value === editingProfile.apiFormat)?.desc}
                          </p>
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
                            <span>API Key 仅保存在您的浏览器本地，不会上传到任何服务器。</span>
                          </div>
                        </div>

                        {/* 当前默认模型显示 */}
                        <div>
                          <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5">默认模型</label>
                          <div className="flex items-center gap-2 p-2 bg-[#E8F3EE] rounded-lg">
                            <Check className="w-4 h-4 text-[#4B8A6E]" />
                            <span className="text-sm text-[#1A1A1A]">
                              {editingProfile.models.find(m => m.modelId === editingProfile.defaultModelId)?.name || '未设置'}
                            </span>
                            <span className="text-xs text-[#888] ml-auto">
                              ({editingProfile.models.length} 个模型)
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#888]">
                            点击"模型列表"标签管理多个模型
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[#E5E5E0] space-y-3">
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

                        {/* 测试成功后显示设为当前使用按钮 */}
                        {testStatus === 'success' && activeProfileId !== editingProfile.id && (
                          <button
                            onClick={() => {
                              setActiveProfile(editingProfile.id);
                              setTestStatus('idle');
                            }}
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium bg-[#4B8A6E] text-white hover:bg-[#3D6F5B] transition-colors"
                          >
                            <Check className="w-4 h-4" />
                            使用此配置
                          </button>
                        )}

                        {/* 排查指南 */}
                        {testStatus === 'error' && (
                          <TroubleshootingGuide
                            apiFormat={editingProfile.apiFormat}
                            baseUrl={editingProfile.baseUrl}
                          />
                        )}

                        {/* 手动展开排查指南（连接前或成功后也能查看） */}
                        {testStatus !== 'error' && (
                          <button
                            onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                            className="flex items-center justify-center gap-1 w-full py-2 text-xs text-[#888] hover:text-[#666] transition-colors"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            {showTroubleshooting ? '收起排查指南' : '配置遇到问题？点击查看排查指南'}
                            {showTroubleshooting ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        {showTroubleshooting && testStatus !== 'error' && (
                          <TroubleshootingGuide
                            apiFormat={editingProfile.apiFormat}
                            baseUrl={editingProfile.baseUrl}
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-base font-medium text-[#1A1A1A]">模型列表</h3>
                        <button
                          onClick={handleAddModel}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#4B8A6E] bg-[#E8F3EE] hover:bg-[#DDF0E7] rounded-md transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          添加模型
                        </button>
                      </div>

                      <div className="space-y-2">
                        {editingProfile.models.map((model) => (
                          <div
                            key={model.id}
                            className={`p-3 rounded-lg border transition-colors ${
                              model.modelId === editingProfile.defaultModelId
                                ? 'border-[#4B8A6E] bg-[#E8F3EE]'
                                : 'border-[#E5E5E0] bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="defaultModel"
                                checked={model.modelId === editingProfile.defaultModelId}
                                onChange={() => handleSetDefaultModel(model.modelId)}
                                className="w-4 h-4 text-[#4B8A6E]"
                              />
                              <div className="flex-1 grid grid-cols-2 gap-2">
                                <input
                                  className="bg-transparent border border-[#D5D5D0] rounded px-2 py-1 text-sm outline-none focus:border-[#8B9D83]"
                                  value={model.name}
                                  onChange={(e) => handleUpdateModel(model.id, { name: e.target.value })}
                                  placeholder="显示名称"
                                />
                                <input
                                  className="bg-transparent border border-[#D5D5D0] rounded px-2 py-1 text-sm outline-none focus:border-[#8B9D83]"
                                  value={model.modelId}
                                  onChange={(e) => handleUpdateModel(model.id, { modelId: e.target.value })}
                                  placeholder="模型ID"
                                />
                              </div>
                              <button
                                onClick={() => handleDeleteModel(model.id)}
                                className="p-1.5 text-[#888] hover:text-[#E84C3D] hover:bg-[#FDECEA] rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="text-xs text-[#888] p-3 bg-[#F2F2EC] rounded-lg">
                        <p className="font-medium mb-1">提示：</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>显示名称用于在界面中展示，如"GPT-4"、"Kimi K2"</li>
                          <li>模型ID是调用API时使用的真实ID，如"gpt-4"、"kimi-k2-0711-preview"</li>
                          <li>选中单选按钮可将该模型设为默认使用</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </>
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
