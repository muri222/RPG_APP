import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, addDoc, getDoc, collection, getDocs, query, where, onSnapshot, deleteDoc } from 'firebase/firestore';
import { ChevronDown, ChevronUp, Save, Trash2, Users, BookOpen, Brain, FileText, PlusCircle, Loader2, Wand2, Menu, X, UserCircle, Sun, Moon, Send, Sparkles, Copy, MessageSquare, HelpCircle, ListPlus, Edit3, Shuffle, Download, Info } from 'lucide-react';

// Configuração do Firebase
const firebaseConfigFallback = {
  apiKey: "YOUR_FALLBACK_API_KEY", 
  authDomain: "YOUR_FALLBACK_AUTH_DOMAIN",
  projectId: "YOUR_FALLBACK_PROJECT_ID",
  storageBucket: "YOUR_FALLBACK_STORAGE_BUCKET",
  messagingSenderId: "YOUR_FALLBACK_MESSAGING_SENDER_ID",
  appId: "YOUR_FALLBACK_APP_ID"
};

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : firebaseConfigFallback;
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const appId = typeof __app_id !== 'undefined' ? __app_id : 'rpg-campaign-helper-default';

// Constantes
const storyStyles = ['Aventura', 'Investigação', 'Intriga Política', 'Exploração', 'Sobrevivência', 'Terror Psicológico', 'Slice of Life', 'Dungeon Crawl'];
const moods = ['Heróico', 'Sombrio', 'Cômico', 'Misterioso', 'Tenso', 'Leve', 'Épico', 'Melancólico', 'Ação Frenética'];
const eras = ['Pré-histórico', 'Antiguidade Clássica', 'Medieval', 'Renascentista', 'Era dos Descobrimentos', 'Vitoriana', 'Anos 20 (Roaring Twenties)', 'Segunda Guerra Mundial', 'Guerra Fria', 'Moderna', 'Futurista Próximo', 'Futurista Distante', 'Pós-apocalíptico'];
const settings = ['Cidade grande', 'Vila pequena', 'Ermos selvagens', 'Floresta densa', 'Montanhas perigosas', 'Deserto escaldante', 'Masmorra antiga', 'Castelo assombrado', 'Espaçonave', 'Estação espacial', 'Planeta alienígena', 'Plano extraplanar', 'Realidade virtual', 'Submundo do crime'];
const sheetRpgSystemsOptions = [
  { value: 'Genérico Fantasia', label: 'Genérico: Fantasia Medieval' },
  { value: 'Genérico Sci-Fi', label: 'Genérico: Ficção Científica' },
  { value: 'Genérico Horror', label: 'Genérico: Horror Contemporâneo' },
  { value: 'D&D 5e', label: 'D&D 5ª Edição' },
  { value: 'Pathfinder 2e', label: 'Pathfinder 2ª Edição' },
  { value: 'Call of Cthulhu', label: 'Chamado de Cthulhu' },
  { value: 'Vampire: The Masquerade', label: 'Vampiro: A Máscara' },
  { value: 'Cyberpunk RED', label: 'Cyberpunk RED' },
];

const tabs = [
  { id: 'creator', label: 'Criador de Campanhas', icon: <Wand2 /> },
  { id: 'saved', label: 'Minhas Campanhas', icon: <Save /> },
  { id: 'gm_ai', label: 'Mestre Virtual', icon: <Brain /> },
  { id: 'sheet', label: 'Modelo de Ficha', icon: <FileText /> },
];

const gmQuickActions = [
  { label: "Descreva esta cena", prompt: "Com base no contexto da campanha, descreva uma cena interessante que poderia acontecer agora." },
  { label: "Reação de NPC?", prompt: "Escolha um NPC da campanha (se houver algum definido) e descreva como ele reagiria a uma situação inesperada (ex: ser confrontado pelos jogadores)." },
  { label: "Sugira um Plot Twist", prompt: "Sugira um plot twist surpreendente para a história da campanha atual." },
  { label: "Ideia de Encontro", prompt: "Gere uma ideia para um encontro (social, combate ou exploração) que se encaixe na campanha." },
];

// Componentes reutilizáveis
const CollapsibleSection = ({ title, icon, children, isOpen, onToggle, defaultOpen = false, darkMode }) => {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const currentIsOpen = isOpen !== undefined ? isOpen : internalIsOpen;
  const handleToggle = onToggle || (() => setInternalIsOpen(!internalIsOpen));

  return (
    <div className={`mb-4 border rounded-lg shadow-md ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}>
      <button
        onClick={handleToggle}
        className={`w-full flex justify-between items-center p-4 text-left text-lg font-semibold rounded-t-lg focus:outline-none ${darkMode ? 'text-purple-300 hover:bg-gray-700' : 'text-purple-700 hover:bg-gray-100'}`}
      >
        <div className="flex items-center">
          {icon && React.cloneElement(icon, { className: `mr-3 h-6 w-6 ${darkMode ? 'text-purple-400' : 'text-purple-600'}` })}
          {title}
        </div>
        {currentIsOpen ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
      </button>
      {currentIsOpen && <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>{children}</div>}
    </div>
  );
};

const StyledButton = ({ onClick, children, icon, className = '', isLoading = false, variant = 'primary', size = 'normal', darkMode }) => {
  const baseStyle = "flex items-center justify-center rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizeStyles = {
    small: "px-3 py-1.5 text-sm",
    normal: "px-4 py-2",
    large: "px-6 py-3 text-lg"
  };
  
  // Ajuste de variantes para modo claro
  const variants = {
    primary: darkMode ? "bg-purple-600 hover:bg-purple-700 text-white focus:ring-purple-500" : "bg-purple-500 hover:bg-purple-600 text-white focus:ring-purple-400",
    secondary: darkMode ? "bg-gray-600 hover:bg-gray-700 text-gray-200 focus:ring-gray-500" : "bg-gray-200 hover:bg-gray-300 text-gray-700 focus:ring-gray-400",
    danger: darkMode ? "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500" : "bg-red-500 hover:bg-red-600 text-white focus:ring-red-400",
    ghost: darkMode ? "bg-transparent hover:bg-gray-700 text-purple-300 focus:ring-purple-500" : "bg-transparent hover:bg-gray-200 text-purple-600 focus:ring-purple-400"
  };
  return (
    <button onClick={onClick} className={`${baseStyle} ${sizeStyles[size]} ${variants[variant]} ${className}`} disabled={isLoading}>
      {isLoading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : (icon && React.cloneElement(icon, { className: "mr-2 h-5 w-5" }))}
      {children}
    </button>
  );
};

const StyledSelect = ({ label, value, onChange, options, name, className = '', darkMode }) => (
  <div className={`mb-4 ${className}`}>
    {label && <label htmlFor={name} className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{label}</label>}
    <select
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      className={`w-full p-2 border rounded-md focus:ring-purple-500 focus:border-purple-500 ${darkMode ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
    >
      {options.map(opt => <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>)}
    </select>
  </div>
);

const StyledTextarea = ({ label, value, onChange, name, placeholder, rows = 3, className = '', readOnly = false, darkMode }) => (
  <div className={`mb-4 ${className}`}>
    {label && <label htmlFor={name} className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{label}</label>}
    <textarea
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      readOnly={readOnly}
      className={`w-full p-2 border rounded-md focus:ring-purple-500 focus:border-purple-500 font-mono text-sm ${readOnly ? (darkMode ? 'bg-gray-600 cursor-not-allowed' : 'bg-gray-200 cursor-not-allowed text-gray-700') : (darkMode ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-white text-gray-900 border-gray-300')} ${className}`}
    />
  </div>
);

const StyledInput = ({ label, type = "text", value, onChange, name, placeholder, className = '', darkMode }) => (
  <div className={`mb-4 ${className}`}>
    {label && <label htmlFor={name} className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{label}</label>}
    <input
      type={type}
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full p-2 border rounded-md focus:ring-purple-500 focus:border-purple-500 ${darkMode ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
    />
  </div>
);

const Modal = ({ isOpen, onClose, title, children, darkMode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className={`p-6 rounded-lg shadow-xl w-full max-w-md ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-900'}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-xl font-semibold ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>{title}</h3>
          <button onClick={onClose} className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
            <X className="h-6 w-6" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// Toast não precisa de darkMode prop, pois suas cores são fixas por tipo (success/error)

function App() {
  const [currentTab, setCurrentTab] = useState('creator');
  const [campaignDetails, setCampaignDetails] = useState({
    name: '',
    rpgSystem: 'Genérico Fantasia', 
    storyStyle: 'Aventura',
    mood: 'Heróico',
    era: 'Medieval',
    setting: 'Ermos selvagens',
    customSettingDetails: '',
    generatedStoryPlot: '',
    generatedNPC: null, 
    generatedPlayerConcept: null, 
    npcCustomizationQuery: '', 
    playerConceptCustomizationQuery: '', 
  });
  const [savedCampaigns, setSavedCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState({ 
    story: false, npc: false, playerConcept: false, save: false, load: false, gmAi: false, sheet: false 
  }); 
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [openSections, setOpenSections] = useState({ story: true, npc: true, playerConcept: true }); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentCampaignId, setCurrentCampaignId] = useState(null); 
  const [toast, setToast] = useState({ message: '', type: '', visible: false });
  const [darkMode, setDarkMode] = useState(true);

  const [gmAiMessages, setGmAiMessages] = useState([]); 
  const [gmAiInput, setGmAiInput] = useState('');
  const gmAiChatEndRef = useRef(null);

  const [sheetRpgSystem, setSheetRpgSystem] = useState('Genérico Fantasia');
  const [generatedSheetTemplate, setGeneratedSheetTemplate] = useState('');
  const [editableSheetContent, setEditableSheetContent] = useState('');
  const [customSheetAttributes, setCustomSheetAttributes] = useState([]); 
  const [newCustomAttributeName, setNewCustomAttributeName] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [campaignToDeleteId, setCampaignToDeleteId] = useState(null);

  useEffect(() => {
    setEditableSheetContent(generatedSheetTemplate);
  }, [generatedSheetTemplate]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const showToast = (message, type = 'success', duration = 3000) => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast({ message: '', type: '', visible: false }), duration);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        try {
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
          } else {
            await signInAnonymously(auth);
          }
        } catch (error) {
          console.error("Erro na autenticação anônima/customizada:", error);
          showToast("Erro na autenticação.", "error");
        }
      }
      setIsAuthReady(true);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !userId) return;
    const campaignsColPath = `artifacts/${appId}/users/${userId}/campaigns`;
    const q = query(collection(db, campaignsColPath));
    const unsubscribeCampaigns = onSnapshot(q, (querySnapshot) => {
      const campaignsData = [];
      querySnapshot.forEach((doc) => {
        campaignsData.push({ id: doc.id, ...doc.data() });
      });
      setSavedCampaigns(campaignsData);
    }, (error) => {
      console.error("Erro ao buscar campanhas: ", error);
      showToast("Erro ao buscar campanhas.", "error");
    });
    return () => unsubscribeCampaigns();
  }, [isAuthReady, userId]);

  useEffect(() => {
    gmAiChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [gmAiMessages]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCampaignDetails(prev => ({ ...prev, [name]: value }));
  };

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  const callGeminiAPI = async (prompt, isJsonOutput = false, schema = null) => {
    const apiKey = ""; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    let payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
    if (isJsonOutput && schema) {
      payload.generationConfig = { responseMimeType: "application/json", responseSchema: schema };
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Erro na API Gemini:", response.status, errorBody);
        throw new Error(`API Error: ${response.status} ${errorBody}`);
      }
      const result = await response.json();
      if (result.candidates && result.candidates[0]?.content?.parts?.[0]) {
        const part = result.candidates[0].content.parts[0];
        return isJsonOutput ? JSON.parse(part.text) : part.text;
      } else {
        console.warn("Resposta inesperada da API Gemini:", result);
        if (result.promptFeedback?.blockReason) {
          throw new Error(`Conteúdo bloqueado: ${result.promptFeedback.blockReason} - ${result.promptFeedback.blockReasonMessage || ''}`);
        }
        throw new Error("Nenhum conteúdo retornado pela API Gemini.");
      }
    } catch (error) {
      console.error("Erro ao chamar API Gemini:", error);
      showToast(`Erro na API Gemini: ${error.message}`, "error");
      throw error;
    }
  };

  const generateStoryPlot = async () => {
    setIsLoading(prev => ({ ...prev, story: true }));
    const { rpgSystem, storyStyle, mood, era, setting, customSettingDetails } = campaignDetails;
    const prompt = `Crie uma ideia de enredo detalhada para uma campanha de RPG de mesa.
      Sistema: ${rpgSystem}. Estilo: ${storyStyle}. Clima: ${mood}. Época: ${era}. Ambientação: ${setting}. Detalhes: ${customSettingDetails || 'Nenhum.'}
      O enredo deve incluir: objetivo principal, antagonista/conflito, PONTOS CHAVE (introdução, desenvolvimento, clímax) e locais importantes. Formato: Texto descritivo.`;
    try {
      const plot = await callGeminiAPI(prompt);
      setCampaignDetails(prev => ({ ...prev, generatedStoryPlot: plot }));
      showToast("Enredo gerado!");
    } finally {
      setIsLoading(prev => ({ ...prev, story: false }));
    }
  };

  const singleNpcSchema = { 
    type: "OBJECT", 
    properties: { 
        name: { type: "STRING", description: "Nome do NPC" }, 
        description: { type: "STRING", description: "Breve descrição física e de personalidade" }, 
        motivation: { type: "STRING", description: "Principal motivação ou objetivo do NPC" }, 
        secret: { type: "STRING", description: "Um segredo ou informação oculta sobre o NPC (opcional)" } 
    }, 
    required: ["name", "description", "motivation"] 
  };

  const generateNPC = async (isRandom = false) => {
    setIsLoading(prev => ({ ...prev, npc: true }));
    const { rpgSystem, setting, mood, customSettingDetails, npcCustomizationQuery } = campaignDetails;
    
    let customizationPrompt = "";
    if (!isRandom && npcCustomizationQuery.trim()) {
        customizationPrompt = `O usuário especificou as seguintes características para o NPC: "${npcCustomizationQuery}". Tente incorporar isso.`;
    } else if (isRandom) {
        customizationPrompt = "Gere um NPC completamente aleatório e surpreendente, mas que ainda se encaixe no contexto da campanha.";
    }

    const prompt = `Gere UM NPC (Personagem Não Jogador) distinto e interessante para uma campanha de RPG de mesa.
      Sistema: ${rpgSystem}.
      Ambientação: ${setting} (${customSettingDetails || 'sem detalhes adicionais'}).
      Clima da Campanha: ${mood}.
      ${customizationPrompt}
      Para o NPC, forneça nome, descrição (aparência e personalidade), motivação principal e um possível segredo.
      Retorne o NPC como um único objeto JSON.`;
    try {
      const npcData = await callGeminiAPI(prompt, true, singleNpcSchema);
      setCampaignDetails(prev => ({ ...prev, generatedNPC: npcData || null }));
      showToast("NPC gerado com sucesso!");
    } catch { 
      setCampaignDetails(prev => ({ ...prev, generatedNPC: null })); 
    } 
    finally { setIsLoading(prev => ({ ...prev, npc: false })); }
  };

  const singlePlayerConceptSchema = { 
    type: "OBJECT", 
    properties: { 
        conceptName: { type: "STRING", description: "Um título ou nome para o conceito do personagem" }, 
        suggestedClassArchetype: { type: "STRING", description: `Classe, arquétipo ou papel sugerido no sistema ${campaignDetails.rpgSystem}` }, 
        backgroundHook: { type: "STRING", description: "Um gancho de história interessante ou elemento de background" }, 
        personalGoal: { type: "STRING", description: "Um objetivo pessoal que o personagem poderia ter" } 
    }, 
    required: ["conceptName", "suggestedClassArchetype", "backgroundHook", "personalGoal"] 
  };

  const generatePlayerConcept = async (isRandom = false) => {
    setIsLoading(prev => ({ ...prev, playerConcept: true }));
    const { rpgSystem, storyStyle, mood, setting, playerConceptCustomizationQuery } = campaignDetails;

    let customizationPrompt = "";
    if (!isRandom && playerConceptCustomizationQuery.trim()) {
        customizationPrompt = `O usuário especificou as seguintes características para o conceito: "${playerConceptCustomizationQuery}". Tente incorporar isso.`;
    } else if (isRandom) {
        customizationPrompt = "Gere um conceito de personagem completamente aleatório e original, mas que ainda se encaixe no contexto da campanha.";
    }
    
    const prompt = `Gere UM conceito de personagem jogador para uma campanha de RPG de mesa.
      Sistema: ${rpgSystem}.
      Estilo da História: ${storyStyle}.
      Clima: ${mood}.
      Ambientação: ${setting}.
      ${customizationPrompt}
      Para o conceito, sugira um nome para o conceito, uma classe/arquétipo (adequado ao sistema ${rpgSystem}), um gancho de história/background e um objetivo pessoal.
      Retorne o conceito como um único objeto JSON.`;
    try {
      const concept = await callGeminiAPI(prompt, true, singlePlayerConceptSchema);
      setCampaignDetails(prev => ({ ...prev, generatedPlayerConcept: concept || null }));
      showToast("Conceito de personagem gerado!");
    } catch { 
      setCampaignDetails(prev => ({ ...prev, generatedPlayerConcept: null })); 
    }
    finally { setIsLoading(prev => ({ ...prev, playerConcept: false })); }
  };

  const saveCampaign = async () => {
    if (!userId) { showToast("Usuário não autenticado.", "error"); return; }
    if (!campaignDetails.name.trim()) { showToast("Dê um nome para a campanha.", "error"); return; }
    setIsLoading(prev => ({ ...prev, save: true }));
    const campaignData = { ...campaignDetails, ownerId: userId, lastUpdated: new Date().toISOString() };
    try {
      const campaignsColPath = `artifacts/${appId}/users/${userId}/campaigns`;
      if (currentCampaignId) {
        await setDoc(doc(db, campaignsColPath, currentCampaignId), campaignData);
        showToast("Campanha atualizada!");
      } else {
        const newDocRef = await addDoc(collection(db, campaignsColPath), campaignData);
        setCurrentCampaignId(newDocRef.id);
        showToast("Campanha salva!");
      }
    } catch (error) { console.error("Erro ao salvar:", error); showToast("Erro ao salvar.", "error"); }
    finally { setIsLoading(prev => ({ ...prev, save: false })); }
  };

  const loadCampaign = (campaign) => {
    const loadedDetails = {
        ...campaign,
        npcCustomizationQuery: campaign.npcCustomizationQuery || '',
        playerConceptCustomizationQuery: campaign.playerConceptCustomizationQuery || '',
        generatedNPC: campaign.generatedNPC || null,
        generatedPlayerConcept: campaign.generatedPlayerConcept || null,
    };
    setCampaignDetails(loadedDetails);
    setCurrentCampaignId(campaign.id);
    setGmAiMessages([]); 
    setCurrentTab('creator');
    showToast(`Campanha "${campaign.name}" carregada.`);
  };
  
  const confirmDeleteCampaign = (campaignId) => {
    setCampaignToDeleteId(campaignId);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!userId || !campaignToDeleteId) {
      showToast("Erro ao deletar: ID ou usuário faltando.", "error");
      setIsDeleteModalOpen(false);
      return;
    }
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/campaigns`, campaignToDeleteId));
      showToast("Campanha deletada!");
      if (currentCampaignId === campaignToDeleteId) {
        resetCampaignCreator();
      }
    } catch (error) { console.error("Erro ao deletar:", error); showToast("Erro ao deletar.", "error"); }
    finally {
      setIsDeleteModalOpen(false);
      setCampaignToDeleteId(null);
    }
  };

  const resetCampaignCreator = () => {
    setCampaignDetails({ 
        name: '', 
        rpgSystem: 'Genérico Fantasia', 
        storyStyle: 'Aventura', 
        mood: 'Heróico', 
        era: 'Medieval', 
        setting: 'Ermos selvagens', 
        customSettingDetails: '', 
        generatedStoryPlot: '', 
        generatedNPC: null, 
        generatedPlayerConcept: null,
        npcCustomizationQuery: '',
        playerConceptCustomizationQuery: ''
    });
    setCurrentCampaignId(null);
    setGmAiMessages([]); 
    showToast("Formulário limpo.");
  };

  const handleGmAiSend = async (messageToSend = gmAiInput) => {
    if (!messageToSend.trim()) return;
    const userMessage = { sender: 'user', text: messageToSend };
    setGmAiMessages(prev => [...prev, userMessage]);
    setGmAiInput('');
    setIsLoading(prev => ({ ...prev, gmAi: true }));

    let campaignContext = "Nenhuma campanha carregada.";
    if (currentCampaignId && campaignDetails.name) {
        campaignContext = `Contexto da Campanha Atual ("${campaignDetails.name}"):
        Sistema: ${campaignDetails.rpgSystem}
        Enredo Principal: ${campaignDetails.generatedStoryPlot || "Não definido."}
        NPC Gerado: ${campaignDetails.generatedNPC ? `${campaignDetails.generatedNPC.name} (Motivação: ${campaignDetails.generatedNPC.motivation})` : "Nenhum NPC gerado para esta campanha ainda."}
        Estilo: ${campaignDetails.storyStyle}, Clima: ${campaignDetails.mood}, Época: ${campaignDetails.era}, Ambientação: ${campaignDetails.setting} ${campaignDetails.customSettingDetails ? `(${campaignDetails.customSettingDetails})` : ''}
        `;
    }
    
    const prompt = `Você é um Mestre de RPG prestativo. 
      ${campaignContext}
      O usuário diz: "${messageToSend}"
      Responda como um Mestre de RPG, auxiliando o usuário.`;

    try {
      const aiResponseText = await callGeminiAPI(prompt);
      setGmAiMessages(prev => [...prev, { sender: 'ai', text: aiResponseText }]);
    } catch (error) {
      setGmAiMessages(prev => [...prev, { sender: 'ai', text: "Desculpe, não consegui processar sua solicitação no momento." }]);
    } finally {
      setIsLoading(prev => ({ ...prev, gmAi: false }));
    }
  };

  const handleAddCustomAttribute = () => {
    if (newCustomAttributeName.trim()) {
      setCustomSheetAttributes(prev => [...prev, { id: Date.now().toString(), name: newCustomAttributeName.trim() }]);
      setNewCustomAttributeName('');
    }
  };
  const handleRemoveCustomAttribute = (idToRemove) => {
    setCustomSheetAttributes(prev => prev.filter(attr => attr.id !== idToRemove));
  };

  const generateCharacterSheetTemplate = () => {
    setIsLoading(prev => ({ ...prev, sheet: true }));
    let template = `# Ficha de Personagem: [NOME DO PERSONAGEM AQUI]\n\n`;
    template += `## Sistema: ${sheetRpgSystem}\n\n`;
    template += `**Jogador:**\n`;
    template += `**Conceito/Arquétipo:**\n\n`;
    template += `--- \n`;

    template += `### Atributos Principais\n`;
    template += `*Dica: Preencha os valores e modificadores conforme o sistema.*\n`;
    if (sheetRpgSystem.toLowerCase().includes('d&d') || sheetRpgSystem.toLowerCase().includes('pathfinder') || sheetRpgSystem.toLowerCase().includes('fantasia')) {
        template += `* **Força:** \n* **Destreza:** \n* **Constituição:** \n* **Inteligência:** \n* **Sabedoria:** \n* **Carisma:** \n\n`;
    } else if (sheetRpgSystem.toLowerCase().includes('cyberpunk')) {
        template += `* **Inteligência (INT):** \n* **Reflexos (REF):** \n* **Destreza (DEX):** \n* **Técnica (TECH):** \n* **Autocontrole (COOL):** \n* **Vontade (WILL):** \n* **Sorte (LUCK):** \n* **Movimento (MOVE):** \n* **Corpo (BODY):** \n* **Empatia (EMP):** \n\n`;
    } else if (sheetRpgSystem.toLowerCase().includes('vampiro')) {
        template += `**Atributos Físicos:**\n  * Força: \n  * Destreza: \n  * Vigor: \n\n`;
        template += `**Atributos Sociais:**\n  * Carisma: \n  * Manipulação: \n  * Aparência: \n\n`;
        template += `**Atributos Mentais:**\n  * Percepção: \n  * Inteligência: \n  * Raciocínio: \n\n`;
    } else { 
        template += `* **Atributo Chave 1:** \n* **Atributo Chave 2:** \n* **Atributo Chave 3:** \n* **Atributo Chave 4:** \n\n`;
    }
    template += `--- \n`;

    template += `### Perícias\n`;
    template += `*Dica: Liste as perícias e seus respectivos níveis ou bônus.*\n`;
    template += `* Perícia Exemplo 1 (Nível/Bônus): \n`;
    template += `* Perícia Exemplo 2 (Nível/Bônus): \n`;
    template += `* Perícia Exemplo 3 (Nível/Bônus): \n\n`;
    template += `--- \n`;

    if (customSheetAttributes.length > 0) {
        template += `### Atributos Personalizados\n`;
        customSheetAttributes.forEach(attr => {
            template += `* **${attr.name}:** \n`;
        });
        template += `\n--- \n`;
    }

    template += `### Equipamento\n`;
    template += `*Dica: Liste armas, armaduras, itens importantes.*\n`;
    template += `* Item 1: \n* Item 2: \n\n`;
    template += `--- \n`;
    
    template += `### Habilidades Especiais / Talentos / Magias\n`;
    template += `* Habilidade/Talento/Magia 1: (Descrição breve)\n`;
    template += `* Habilidade/Talento/Magia 2: (Descrição breve)\n\n`;
    template += `--- \n`;

    template += `### História e Aparência\n`;
    template += `**Aparência:**\n\n\n`;
    template += `**Personalidade:**\n\n\n`;
    template += `**Histórico/Background:**\n\n\n`;
    template += `--- \n`;

    template += `### Notas Adicionais\n\n\n`;

    setGeneratedSheetTemplate(template);
    showToast("Modelo de ficha gerado!");
    setIsLoading(prev => ({ ...prev, sheet: false }));
  };

  const copyToClipboard = (text) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        showToast("Conteúdo copiado!");
      } else {
        showToast("Falha ao copiar. Tente manualmente.", "error");
      }
    } catch (err) {
      showToast("Falha ao copiar. Tente manualmente.", "error");
      console.error('Fallback: Oops, unable to copy', err);
    }
  };

  const exportCampaignToTxt = (campaign) => {
    let campaignText = `CAMPANHA DE RPG: ${campaign.name || 'Sem Nome'}\n`;
    campaignText += `==================================================\n\n`;
    campaignText += `SISTEMA DE RPG: ${campaign.rpgSystem || 'Não definido'}\n`;
    campaignText += `ESTILO DA HISTÓRIA: ${campaign.storyStyle || 'Não definido'}\n`;
    campaignText += `CLIMA/TOM: ${campaign.mood || 'Não definido'}\n`;
    campaignText += `ÉPOCA: ${campaign.era || 'Não definida'}\n`;
    campaignText += `AMBIENTAÇÃO PRINCIPAL: ${campaign.setting || 'Não definida'}\n`;
    if (campaign.customSettingDetails) {
      campaignText += `DETALHES ADICIONAIS DA AMBIENTAÇÃO:\n${campaign.customSettingDetails}\n`;
    }
    campaignText += `\n--------------------------------------------------\n`;
    campaignText += `ENREDO DA HISTÓRIA:\n--------------------------------------------------\n`;
    campaignText += `${campaign.generatedStoryPlot || 'Nenhum enredo gerado.'}\n\n`;
    
    campaignText += `--------------------------------------------------\n`;
    campaignText += `NPC GERADO:\n--------------------------------------------------\n`;
    if (campaign.generatedNPC) {
      const npc = campaign.generatedNPC;
      campaignText += `Nome: ${npc.name || 'N/A'}\n`;
      campaignText += `Descrição: ${npc.description || 'N/A'}\n`;
      campaignText += `Motivação: ${npc.motivation || 'N/A'}\n`;
      if (npc.secret) {
        campaignText += `Segredo: ${npc.secret}\n`;
      }
    } else {
      campaignText += `Nenhum NPC gerado para esta campanha.\n`;
    }
    campaignText += `\n`;

    campaignText += `--------------------------------------------------\n`;
    campaignText += `CONCEITO DE PERSONAGEM GERADO:\n--------------------------------------------------\n`;
    if (campaign.generatedPlayerConcept) {
      const concept = campaign.generatedPlayerConcept;
      campaignText += `Nome do Conceito: ${concept.conceptName || 'N/A'}\n`;
      campaignText += `Classe/Arquétipo Sugerido: ${concept.suggestedClassArchetype || 'N/A'}\n`;
      campaignText += `Gancho de Background: ${concept.backgroundHook || 'N/A'}\n`;
      campaignText += `Objetivo Pessoal: ${concept.personalGoal || 'N/A'}\n`;
    } else {
      campaignText += `Nenhum conceito de personagem gerado para esta campanha.\n`;
    }
    campaignText += `\n==================================================\n`;
    campaignText += `FIM DA EXPORTAÇÃO\n`;

    const filename = `${campaign.name || 'CampanhaRPG'}.txt`;
    const element = document.createElement('a');
    const file = new Blob([campaignText], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
    showToast(`Campanha "${campaign.name}" exportada como ${filename}`);
  };


  const renderTabContent = () => {
    switch (currentTab) {
      case 'creator':
        return (
          <div className="space-y-6">
            <StyledInput darkMode={darkMode} label="Nome da Campanha" name="name" value={campaignDetails.name} onChange={handleInputChange} placeholder="Ex: A Saga da Espada Lunar"/>
            <div className="grid md:grid-cols-2 gap-4">
              <StyledSelect darkMode={darkMode} label="Sistema de RPG" name="rpgSystem" value={campaignDetails.rpgSystem} onChange={handleInputChange} options={rpgSystems} />
              <StyledSelect darkMode={darkMode} label="Estilo da História" name="storyStyle" value={campaignDetails.storyStyle} onChange={handleInputChange} options={storyStyles} />
              <StyledSelect darkMode={darkMode} label="Clima/Tom" name="mood" value={campaignDetails.mood} onChange={handleInputChange} options={moods} />
              <StyledSelect darkMode={darkMode} label="Época" name="era" value={campaignDetails.era} onChange={handleInputChange} options={eras} />
            </div>
            <StyledSelect darkMode={darkMode} label="Ambientação Principal" name="setting" value={campaignDetails.setting} onChange={handleInputChange} options={settings} />
            <StyledTextarea darkMode={darkMode} label="Detalhes Adicionais da Ambientação" name="customSettingDetails" value={campaignDetails.customSettingDetails} onChange={handleInputChange} placeholder="Ex: Cidade flutuante movida a magia..." rows={4}/>
            
            <div className="flex flex-wrap gap-2 my-4">
              <StyledButton darkMode={darkMode} onClick={saveCampaign} icon={<Save />} isLoading={isLoading.save}>
                {currentCampaignId ? "Atualizar Campanha" : "Salvar Campanha"}
              </StyledButton>
              <StyledButton darkMode={darkMode} onClick={resetCampaignCreator} icon={<PlusCircle />} variant="secondary">Nova Campanha</StyledButton>
            </div>

            <CollapsibleSection darkMode={darkMode} title="Gerador de Enredo" icon={<BookOpen />} defaultOpen>
              <StyledButton darkMode={darkMode} onClick={generateStoryPlot} icon={<Sparkles />} isLoading={isLoading.story} className="w-full md:w-auto">Gerar Ideia de Enredo</StyledButton>
              {campaignDetails.generatedStoryPlot && <div className={`mt-4 p-4 rounded-md whitespace-pre-wrap ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>{campaignDetails.generatedStoryPlot}</div>}
            </CollapsibleSection>

            <CollapsibleSection darkMode={darkMode} title="Gerador de NPC" icon={<Users />} defaultOpen>
              <StyledInput 
                darkMode={darkMode}
                label="Personalizar NPC (opcional)"
                name="npcCustomizationQuery"
                value={campaignDetails.npcCustomizationQuery}
                onChange={handleInputChange}
                placeholder="Ex: um guerreiro anão leal, um mago elfo traidor"
                className="mb-2"
              />
              <div className="flex flex-wrap gap-2">
                <StyledButton darkMode={darkMode} onClick={() => generateNPC(false)} icon={<Sparkles />} isLoading={isLoading.npc} className="flex-grow sm:flex-grow-0">Gerar NPC Personalizado</StyledButton>
                <StyledButton darkMode={darkMode} onClick={() => generateNPC(true)} icon={<Shuffle />} isLoading={isLoading.npc} variant="secondary" className="flex-grow sm:flex-grow-0">Gerar NPC Aleatório</StyledButton>
              </div>
              {campaignDetails.generatedNPC && (
                <div className={`mt-4 p-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <h4 className={`font-semibold ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>{campaignDetails.generatedNPC.name}</h4>
                  <p><strong className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Descrição:</strong> {campaignDetails.generatedNPC.description}</p>
                  <p><strong className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Motivação:</strong> {campaignDetails.generatedNPC.motivation}</p>
                  {campaignDetails.generatedNPC.secret && <p><strong className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Segredo:</strong> {campaignDetails.generatedNPC.secret}</p>}
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection darkMode={darkMode} title="Gerador de Conceito de Personagem" icon={<UserCircle />} defaultOpen>
               <StyledInput 
                darkMode={darkMode}
                label="Personalizar Conceito (opcional)"
                name="playerConceptCustomizationQuery"
                value={campaignDetails.playerConceptCustomizationQuery}
                onChange={handleInputChange}
                placeholder="Ex: um ladino ágil com coração de ouro, um paladino caído em desgraça"
                className="mb-2"
              />
              <div className="flex flex-wrap gap-2">
                <StyledButton darkMode={darkMode} onClick={() => generatePlayerConcept(false)} icon={<Sparkles />} isLoading={isLoading.playerConcept} className="flex-grow sm:flex-grow-0">Gerar Conceito Personalizado</StyledButton>
                <StyledButton darkMode={darkMode} onClick={() => generatePlayerConcept(true)} icon={<Shuffle />} isLoading={isLoading.playerConcept} variant="secondary" className="flex-grow sm:flex-grow-0">Gerar Conceito Aleatório</StyledButton>
              </div>
              {campaignDetails.generatedPlayerConcept && (
                <div className={`mt-4 p-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <h4 className={`font-semibold ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>{campaignDetails.generatedPlayerConcept.conceptName}</h4>
                  <p><strong className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Classe/Arquétipo:</strong> {campaignDetails.generatedPlayerConcept.suggestedClassArchetype}</p>
                  <p><strong className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Gancho:</strong> {campaignDetails.generatedPlayerConcept.backgroundHook}</p>
                  <p><strong className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Objetivo:</strong> {campaignDetails.generatedPlayerConcept.personalGoal}</p>
                </div>
              )}
            </CollapsibleSection>
          </div>
        );
      case 'saved':
        return (
          <div>
            <h2 className={`text-2xl font-semibold mb-6 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>Minhas Campanhas Salvas</h2>
            {isLoading.load && <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Carregando...</p>}
            {!isLoading.load && savedCampaigns.length === 0 && <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Nenhuma campanha salva.</p>}
            <div className="space-y-4">
              {savedCampaigns.map(campaign => (
                <div key={campaign.id} className={`p-4 rounded-lg shadow flex flex-col sm:flex-row justify-between sm:items-center gap-3 ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                  <div>
                    <h3 className={`text-xl font-semibold ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>{campaign.name}</h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sistema: {campaign.rpgSystem} - Atualizado: {campaign.lastUpdated ? new Date(campaign.lastUpdated).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <StyledButton darkMode={darkMode} onClick={() => loadCampaign(campaign)} variant="secondary" size="small">Carregar</StyledButton>
                    <StyledButton darkMode={darkMode} onClick={() => exportCampaignToTxt(campaign)} variant="secondary" icon={<Download />} size="small">Exportar TXT</StyledButton>
                    <StyledButton darkMode={darkMode} onClick={() => confirmDeleteCampaign(campaign.id)} variant="danger" icon={<Trash2 />} size="small">Deletar</StyledButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'gm_ai':
        return (
          <div className="flex flex-col h-[calc(100vh-200px)] md:h-[calc(100vh-180px)]">
            <h2 className={`text-2xl font-semibold mb-4 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>Mestre Virtual (IA)</h2>
            {!currentCampaignId && (
              <div className={`p-4 border rounded-md mb-4 ${darkMode ? 'bg-yellow-800 bg-opacity-50 border-yellow-700 text-yellow-200' : 'bg-yellow-50 border-yellow-400 text-yellow-700'}`}>
                <p className="flex items-center"><HelpCircle className="mr-2 h-5 w-5"/> Para melhor assistência, carregue ou crie uma campanha na aba "Criador de Campanhas".</p>
              </div>
            )}
            {currentCampaignId && campaignDetails.name && (
                 <div className={`mb-3 p-3 rounded-md text-sm ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <p className={`${darkMode ? 'text-purple-300' : 'text-purple-600'} font-semibold`}>Campanha Ativa: {campaignDetails.name}</p>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-xs`}>A IA usará o contexto desta campanha.</p>
                 </div>
            )}

            <div className={`flex-grow overflow-y-auto mb-4 p-3 rounded-md border space-y-3 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300'}`}>
              {gmAiMessages.map((msg, index) => (
                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xl p-3 rounded-lg ${msg.sender === 'user' ? (darkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white') : (darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-800')}`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              <div ref={gmAiChatEndRef} />
            </div>
            
            <CollapsibleSection darkMode={darkMode} title="Ações Rápidas do Mestre" icon={<ListPlus />}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    {gmQuickActions.map(action => (
                        <StyledButton 
                            darkMode={darkMode}
                            key={action.label} 
                            onClick={() => handleGmAiSend(action.prompt)} 
                            variant="secondary" 
                            size="small"
                            isLoading={isLoading.gmAi}
                            className="text-xs"
                        >
                            {action.label}
                        </StyledButton>
                    ))}
                </div>
            </CollapsibleSection>

            <div className="flex gap-2 items-center">
              <StyledInput 
                darkMode={darkMode}
                name="gmAiInput" 
                value={gmAiInput} 
                onChange={(e) => setGmAiInput(e.target.value)} 
                placeholder="Pergunte algo ao Mestre Virtual..." 
                className="flex-grow mb-0"
                onKeyPress={(e) => e.key === 'Enter' && !isLoading.gmAi && handleGmAiSend()}
              />
              <StyledButton darkMode={darkMode} onClick={() => handleGmAiSend()} icon={<Send />} isLoading={isLoading.gmAi} disabled={!gmAiInput.trim()}>
                Enviar
              </StyledButton>
            </div>
          </div>
        );
      case 'sheet':
        return (
          <div>
            <h2 className={`text-2xl font-semibold mb-4 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>Modelo de Ficha de Personagem</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div> 
                <StyledSelect
                  darkMode={darkMode}
                  label="Sistema de RPG para a Ficha"
                  name="sheetRpgSystem"
                  value={sheetRpgSystem}
                  onChange={(e) => setSheetRpgSystem(e.target.value)}
                  options={sheetRpgSystemsOptions}
                />
                <CollapsibleSection darkMode={darkMode} title="Atributos Personalizados" icon={<Edit3 />} defaultOpen>
                  <div className="flex gap-2 mb-3">
                    <StyledInput
                      darkMode={darkMode}
                      name="newCustomAttributeName"
                      value={newCustomAttributeName}
                      onChange={(e) => setNewCustomAttributeName(e.target.value)}
                      placeholder="Nome do atributo personalizado"
                      className="flex-grow mb-0"
                    />
                    <StyledButton darkMode={darkMode} onClick={handleAddCustomAttribute} icon={<PlusCircle />} variant="secondary" size="small">Add</StyledButton>
                  </div>
                  {customSheetAttributes.length > 0 && (
                    <ul className="space-y-1 text-sm">
                      {customSheetAttributes.map(attr => (
                        <li key={attr.id} className={`flex justify-between items-center p-1.5 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <span>{attr.name}</span>
                          <button onClick={() => handleRemoveCustomAttribute(attr.id)} className={`${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'}`}>
                            <Trash2 size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {customSheetAttributes.length === 0 && <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Nenhum atributo personalizado adicionado.</p>}
                </CollapsibleSection>
                <StyledButton darkMode={darkMode} onClick={generateCharacterSheetTemplate} icon={<Sparkles />} isLoading={isLoading.sheet} className="w-full mt-4">
                  Gerar Modelo de Ficha
                </StyledButton>
                 <div className={`mt-3 p-3 border rounded-md text-sm flex items-start ${darkMode ? 'bg-blue-900 bg-opacity-30 border-blue-700 text-blue-200' : 'bg-blue-50 border-blue-300 text-blue-700'}`}>
                    <Info size={28} className={`mr-3 mt-1 flex-shrink-0 ${darkMode ? '' : 'text-blue-600'}`}/>
                    <div>
                        <p className="font-semibold">Dica de Formatação:</p>
                        <p>A ficha abaixo é gerada em formato Markdown. Você pode editá-la diretamente. Para melhor visualização da formatação (negrito, cabeçalhos, listas), copie o conteúdo e cole em um editor de Markdown dedicado (Ex: Typora, Obsidian, VS Code com preview de Markdown).</p>
                    </div>
                </div>
              </div>

              <div> 
                { (generatedSheetTemplate || editableSheetContent) && (
                  <>
                    <StyledTextarea
                      darkMode={darkMode}
                      label="Ficha de Personagem (Editável)"
                      name="editableSheetContent"
                      value={editableSheetContent} 
                      onChange={(e) => setEditableSheetContent(e.target.value)} 
                      readOnly={false} 
                      rows={20} 
                      className="min-h-[400px]" 
                    />
                    <StyledButton darkMode={darkMode} onClick={() => copyToClipboard(editableSheetContent)} icon={<Copy />} variant="secondary" className="w-full mt-2">
                      Copiar Ficha Editada
                    </StyledButton>
                  </>
                )}
                {!(generatedSheetTemplate || editableSheetContent) && (
                    <div className={`mt-6 p-6 border-2 border-dashed rounded-md text-center min-h-[400px] flex flex-col justify-center items-center ${darkMode ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-500'}`}>
                        <FileText size={48} className="mx-auto mb-2"/>
                        <p>Configure as opções e clique em "Gerar Modelo de Ficha" para visualizar e editar aqui.</p>
                    </div>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!isAuthReady) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${darkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
        <Loader2 className={`h-12 w-12 animate-spin mb-4 ${darkMode ? 'text-purple-500' : 'text-purple-600'}`} />
        <p className="text-xl">Autenticando e carregando...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-100 text-gray-800'} flex flex-col transition-colors duration-300`}>
      <header className={`${darkMode ? 'bg-gray-800' : 'bg-white shadow-md'} sticky top-0 z-40`}>
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <Brain className={`h-8 w-8 mr-2 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>Assistente de RPG</h1>
          </div>
          <div className="flex items-center">
            <button onClick={toggleDarkMode} className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}>
              {darkMode ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-gray-700" />}
            </button>
            {userId && <span className={`text-xs ml-2 sm:ml-4 hidden sm:inline ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>ID: {userId.substring(0,10)}...</span>}
            <div className="md:hidden ml-2">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} focus:outline-none`}>
                {isMobileMenuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
              </button>
            </div>
          </div>
        </div>
        <nav className={`hidden md:flex justify-center ${darkMode ? 'bg-gray-800 border-t border-b border-gray-700' : 'bg-gray-50 border-t border-b border-gray-200'}`}>
          <ul className="flex space-x-1 lg:space-x-2 p-2">
            {tabs.map(tab => ( <li key={tab.id}> <button onClick={() => { setCurrentTab(tab.id); setIsMobileMenuOpen(false); }} className={`flex items-center px-3 py-2 lg:px-4 rounded-md text-sm font-medium transition-colors ${currentTab === tab.id ? (darkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white') : (darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900')}`}> {React.cloneElement(tab.icon, { className: "mr-2 h-5 w-5" })} {tab.label} </button> </li> ))}
          </ul>
        </nav>
      </header>

      {isMobileMenuOpen && (
        <nav className={`md:hidden py-2 absolute w-full z-30 border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white shadow-lg border-gray-200'}`}>
          <ul className="flex flex-col space-y-1 px-2">
            {tabs.map(tab => (
              <li key={tab.id}>
                <button
                  onClick={() => { setCurrentTab(tab.id); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center px-3 py-3 rounded-md text-base font-medium transition-colors
                    ${currentTab === tab.id 
                      ? (darkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white') 
                      : (darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900')}`}
                >
                  {React.cloneElement(tab.icon, { className: "mr-3 h-5 w-5" })}
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
      
      <main className="container mx-auto p-4 flex-grow">
        {renderTabContent()}
      </main>

      <footer className={`text-center p-4 mt-auto ${darkMode ? 'bg-gray-800 border-t border-gray-700' : 'bg-gray-100 border-t border-gray-200'}`}>
        <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-700'}`}>Assistente de RPG de Mesa &copy; {new Date().getFullYear()}</p>
      </footer>

      {toast.visible && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, visible: false })} />}
      <Modal darkMode={darkMode} isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Deleção">
        <p className="mb-4">Tem certeza que deseja deletar esta campanha? Esta ação não pode ser desfeita.</p>
        <div className="flex justify-end gap-3">
          <StyledButton darkMode={darkMode} onClick={() => setIsDeleteModalOpen(false)} variant="secondary">Cancelar</StyledButton>
          <StyledButton darkMode={darkMode} onClick={handleDeleteConfirmed} variant="danger">Deletar</StyledButton>
        </div>
      </Modal>
    </div>
  );
}

const rpgSystems = [
    { value: 'D&D 5e', label: 'D&D 5ª Edição' },
    { value: 'Pathfinder 2e', label: 'Pathfinder 2ª Edição' },
    { value: 'Call of Cthulhu', label: 'Chamado de Cthulhu 7ª Edição' },
    { value: 'Vampire: The Masquerade 5e', label: 'Vampiro: A Máscara 5ª Edição' },
    { value: 'Cyberpunk RED', label: 'Cyberpunk RED' },
    { value: 'Shadowrun 6e', label: 'Shadowrun 6ª Edição' },
    { value: 'Genérico Fantasia', label: 'Genérico: Fantasia Medieval' },
    { value: 'Genérico Sci-Fi', label: 'Genérico: Ficção Científica' },
    { value: 'Genérico Horror', label: 'Genérico: Horror Contemporâneo' },
    { value: 'Genérico Super-Heróis', label: 'Genérico: Super-Heróis' },
    { value: 'Custom', label: 'Outro/Customizado' }
  ];

export default App;
