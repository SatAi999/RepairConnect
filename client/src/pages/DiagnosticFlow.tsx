import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  MessageSquare, Mic, MicOff, AlertTriangle, ChevronRight,
  CheckCircle, ArrowLeft, ShieldAlert, Wrench, Loader2
} from 'lucide-react';

interface DiagnosticAnswer { label: string; value: string; nextNode: string; safetyEscalate?: boolean; }
interface DiagnosticNode { id: string; question: string; type: string; answers: DiagnosticAnswer[]; }
interface DiagnosticTree { category: string; startNode: string; nodes: Record<string, DiagnosticNode>; }
interface DiagnosticResult {
  primarySuspect: string; possibleAreas: string[]; recommendedService: string;
  severity: string; cannotDetermineRemotely: string[]; nextStep: string;
  safetyFlagged: boolean; safetyMessage?: string;
}

export const DiagnosticFlow: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [tree, setTree] = useState<DiagnosticTree | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentNode, setCurrentNode] = useState<DiagnosticNode | null>(null);
  const [history, setHistory] = useState<Array<{ node: DiagnosticNode; answer: DiagnosticAnswer }>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [safetyAlert, setSafetyAlert] = useState(false);
  const [category, setCategory] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const caseRes = await api.get(`/repair-cases/${caseId}`);
        const cat = caseRes.data.data.category;
        setCategory(cat);

        const treeRes = await api.get(`/diagnostic/tree/${encodeURIComponent(cat)}`);
        const t: DiagnosticTree = treeRes.data.data;
        setTree(t);

        const sessRes = await api.post(`/diagnostic/start/${caseId}`);
        setSessionId(sessRes.data.data._id);

        const startNode = t.nodes[t.startNode];
        setCurrentNode(startNode || null);
      } catch (e: any) {
        showToast('Could not load diagnostic. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [caseId]);

  const handleAnswer = async (answer: DiagnosticAnswer) => {
    if (!currentNode || !sessionId || !tree) return;
    setSubmitting(true);
    try {
      if (answer.safetyEscalate) {
        await api.post(`/diagnostic/answer/${sessionId}`, {
          questionId: currentNode.id, question: currentNode.question, answer: answer.value, safetyEscalate: true,
        });
        setSafetyAlert(true);
        setSubmitting(false);
        return;
      }
      await api.post(`/diagnostic/answer/${sessionId}`, {
        questionId: currentNode.id, question: currentNode.question, answer: answer.value,
      });

      setHistory(prev => [...prev, { node: currentNode, answer }]);
      const nextNodeId = answer.nextNode;

      if (!nextNodeId || nextNodeId.startsWith('END_') || nextNodeId === 'END') {
        // Complete session
        const compRes = await api.post(`/diagnostic/complete/${sessionId}`);
        setResult(compRes.data.data.result);
      } else {
        const nextNode = tree.nodes[nextNodeId];
        setCurrentNode(nextNode || null);
      }
    } catch (e: any) {
      showToast('Error saving answer. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (history.length === 0 || !tree) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setCurrentNode(prev.node);
    setResult(null);
  };

  const startVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { showToast('Voice input not supported in this browser.', 'error'); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript.toLowerCase();
      setVoiceTranscript(transcript);
      setIsListening(false);
      if (!currentNode) return;
      // Map voice to answer
      const yesAnswer = currentNode.answers.find(a => a.value === 'yes' || a.label.toLowerCase().includes('yes'));
      const noAnswer = currentNode.answers.find(a => a.value === 'no' || a.label.toLowerCase().includes('no'));
      if ((transcript.includes('yes') || transcript.includes('yeah') || transcript.includes('correct')) && yesAnswer) {
        handleAnswer(yesAnswer);
      } else if ((transcript.includes('no') || transcript.includes('nope') || transcript.includes('not')) && noAnswer) {
        handleAnswer(noAnswer);
      }
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setVoiceTranscript('');
  };

  const progress = tree ? Math.min(100, Math.round((history.length / Math.max(Object.keys(tree.nodes).filter(k => !k.startsWith('END_')).length - 1, 1)) * 100)) : 0;

  const severityColors: Record<string, string> = {
    LOW: 'text-green-600 bg-green-50', MEDIUM: 'text-amber-600 bg-amber-50',
    HIGH: 'text-red-600 bg-red-50', SAFETY_CRITICAL: 'text-red-700 bg-red-100',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading diagnostic engine...</p>
        </div>
      </div>
    );
  }

  if (safetyAlert) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center border-2 border-red-200">
          <ShieldAlert className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-700 mb-3">⚠️ SAFETY ALERT</h1>
          <div className="bg-red-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-red-800 font-semibold text-lg mb-2">Stop using this appliance immediately.</p>
            <ul className="text-red-700 space-y-1 text-sm list-disc list-inside">
              <li>Do NOT attempt to open, repair, or continue using the appliance.</li>
              <li>Disconnect from power if safe to do so.</li>
              <li>Keep the appliance away from flammable materials.</li>
              <li>Contact a certified technician or emergency services.</li>
            </ul>
          </div>
          <p className="text-gray-500 text-sm mb-6">A technician visit is required to safely assess this appliance.</p>
          <button onClick={() => navigate('/dashboard')} className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors">
            OK, I understand — Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!tree && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center border border-gray-100">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Diagnostic Not Available</h2>
          <p className="text-gray-500 mb-6">No structured diagnostic tree found for "{category}". Please describe your issue to a technician directly.</p>
          <button onClick={() => navigate(`/cases/${caseId}`)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            Back to Case
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(`/cases/${caseId}`)} className="text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">AI Diagnostic</p>
            <h1 className="font-bold text-gray-900">{category}</h1>
          </div>
          <span className="text-sm text-gray-500 font-medium">{progress}% complete</span>
        </div>
        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mt-3">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Result view */}
        {result ? (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Diagnostic Summary</h2>
              </div>

              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold mb-4 ${severityColors[result.severity] || 'text-gray-600 bg-gray-50'}`}>
                <AlertTriangle className="w-4 h-4" />
                {result.severity === 'SAFETY_CRITICAL' ? 'Safety Critical' : result.severity} Priority
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-1">What We Know</p>
                  <p className="text-gray-700 font-medium">{result.primarySuspect}</p>
                </div>
                {result.possibleAreas.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-2">Possible Areas</p>
                    <div className="flex flex-wrap gap-2">
                      {result.possibleAreas.map((a, i) => (
                        <span key={i} className="bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full border border-blue-100">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
                {result.cannotDetermineRemotely.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-2">Cannot Determine Remotely</p>
                    <ul className="space-y-1">
                      {result.cannotDetermineRemotely.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-gray-400 mt-0.5">•</span>{c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold mb-1">Recommended Service</p>
                  <p className="text-blue-900 font-bold">{result.recommendedService}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-1">Next Step</p>
                  <p className="text-gray-800">{result.nextStep}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => navigate(`/cases/${caseId}`)} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                <Wrench className="w-4 h-4" /> Find Repair Professionals
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Question view */
          <div className="space-y-6">
            {/* Question history */}
            {history.length > 0 && (
              <div className="space-y-2 mb-2">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-400">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="truncate">{h.node.question}</span>
                    <span className="text-blue-500 font-medium flex-shrink-0">{h.answer.label}</span>
                  </div>
                ))}
              </div>
            )}

            {currentNode && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fade-in">
                <div className="flex items-start gap-3 mb-6">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Question {history.length + 1}</p>
                    <p className="text-gray-900 font-semibold text-lg leading-snug">{currentNode.question}</p>
                  </div>
                </div>

                {/* Voice input */}
                <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-xl">
                  <button
                    onClick={startVoice}
                    disabled={isListening || submitting}
                    className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${isListening ? 'bg-red-100 text-red-600' : 'bg-white text-gray-600 hover:text-blue-600 border border-gray-200'}`}
                  >
                    {isListening ? <><MicOff className="w-4 h-4" />Listening...</> : <><Mic className="w-4 h-4" />Voice Answer</>}
                  </button>
                  {voiceTranscript && <span className="text-sm text-gray-500 italic">Heard: "{voiceTranscript}"</span>}
                </div>

                {/* Answer buttons */}
                <div className="space-y-3">
                  {currentNode.answers.map((answer, i) => (
                    <button
                      key={i}
                      onClick={() => handleAnswer(answer)}
                      disabled={submitting}
                      className={`w-full text-left px-5 py-4 rounded-xl border-2 font-medium transition-all hover:scale-[1.01] active:scale-[0.99] min-h-[56px] ${
                        answer.safetyEscalate
                          ? 'border-red-200 bg-red-50 text-red-700 hover:border-red-400 hover:bg-red-100'
                          : 'border-gray-200 bg-white text-gray-800 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span>{answer.label}</span>
                        {answer.safetyEscalate && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                        {!answer.safetyEscalate && <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                      </div>
                    </button>
                  ))}
                </div>

                {submitting && (
                  <div className="mt-4 flex items-center gap-2 text-blue-600 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Processing...</span>
                  </div>
                )}
              </div>
            )}

            {history.length > 0 && (
              <button onClick={handleBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Go back
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
