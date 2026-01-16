import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_URL = 'http://localhost:3000';

// Axios interceptor for authentication
axios.interceptors.request.use(
  (config) => {
    const { token } = JSON.parse(localStorage.getItem('auth') || '{}');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const AdminPanel = () => {
  const { user, logout, token } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  // AI Question Generation States
  const [showQuestionGenerator, setShowQuestionGenerator] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [questionForm, setQuestionForm] = useState({
    topic: 'grammar',
    difficulty: 'intermediate',
    count: 3
  });

  useEffect(() => {
    // #region agent log - Admin UI: Component mounted
    console.log('DEBUG: AdminPanel mounted');    // #endregion

    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    // #region agent log - Admin UI: Dashboard load started
    console.log('DEBUG: Dashboard load started');    // #endregion

    try {
      const response = await axios.get(`${API_URL}/dashboard/admin`);
      setDashboardData(response.data);

      // #region agent log - Admin UI: Dashboard loaded successfully
      console.log('DEBUG: Dashboard loaded successfully');      // #endregion
    } catch (error) {
      // #region agent log - Admin UI: Dashboard load error
      console.log('DEBUG: Dashboard load error', error.message);      // #endregion

      console.error('Error loading dashboard:', error);
      const errorMessage = error.response?.status === 401 ? 'Yetkilendirme hatası. Lütfen tekrar giriş yapın.' :
                          error.response?.status === 403 ? 'Bu işlem için yetkiniz yok.' :
                          error.response?.status >= 500 ? 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.' :
                          'Dashboard yüklenirken hata oluştu. Lütfen sayfayı yenileyin.';
      alert(errorMessage);
    }
    setLoading(false);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }

    setDeleting(userId);
    try {
      await axios.delete(`${API_URL}/dashboard/admin/user/${userId}`);
      await loadDashboard(); // Reload data
      alert('✅ Kullanıcı başarıyla silindi.');
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMessage = error.response?.status === 403 ? 'Bu kullanıcıyı silme yetkiniz yok.' :
                          error.response?.status === 404 ? 'Kullanıcı bulunamadı.' :
                          'Kullanıcı silinirken hata oluştu. Lütfen tekrar deneyin.';
      alert(`❌ ${errorMessage}`);
    }
    setDeleting(null);
  };

  // AI Question Generation Functions
  const handleGenerateQuestions = async () => {
    // Form validation
    if (!questionForm.topic || !questionForm.difficulty) {
      alert('Lütfen konu ve zorluk seviyesini seçin.');
      return;
    }

    if (questionForm.count < 1 || questionForm.count > 10) {
      alert('Soru sayısı 1-10 arası olmalıdır.');
      return;
    }

    setGenerating(true);

    // #region agent log - Admin AI Question Generation: Request sent
    console.log('DEBUG: AI question generation request sent');    // #endregion

    try {
      const response = await axios.post(`${API_URL}/api/admin/generate-question`, questionForm);

      // #region agent log - Admin AI Question Generation: Response received
      console.log('DEBUG: AI question generation response received');      // #endregion

      if (response.data.success && response.data.questions?.length > 0) {
        setGeneratedQuestions(response.data.questions);
        alert(`✅ ${response.data.questions.length} adet soru başarıyla üretildi!`);
      } else {
        alert('❌ Soru üretme başarısız oldu. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      // #region agent log - Admin AI Question Generation: Error occurred
      console.log('DEBUG: AI question generation error', error.message);      // #endregion

      console.error('Error generating questions:', error);
      const errorMessage = error.response?.status === 500 ? 'AI servisi yanıt vermiyor. Lütfen servislerin çalıştığından emin olun.' :
                          error.response?.status === 400 ? 'Geçersiz istek parametreleri.' :
                          'Soru üretme sırasında hata oluştu. Lütfen internet bağlantınızı kontrol edin.';
      alert(`❌ ${errorMessage}`);
    }
    setGenerating(false);
  };

  const handleFormChange = (field, value) => {
    setQuestionForm(prev => ({ ...prev, [field]: value }));

    // #region agent log - Admin UI: Form changed
    console.log('DEBUG: Form field changed', field, value);    // #endregion
  };

  if (loading || !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Dashboard yükleniyor...</div>
          <div className="text-sm text-gray-500 mt-2">Lütfen bekleyin</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{user?.email}</span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setShowQuestionGenerator(!showQuestionGenerator)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <span>🤖</span>
              {showQuestionGenerator ? 'Hide' : 'Show'} AI Question Generator
            </button>
          </div>
        </div>

        {/* AI Question Generator */}
        {showQuestionGenerator && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">AI Question Generator</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                <select
                  value={questionForm.topic}
                  onChange={(e) => handleFormChange('topic', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="grammar">Grammar</option>
                  <option value="vocabulary">Vocabulary</option>
                  <option value="reading">Reading</option>
                  <option value="writing">Writing</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <select
                  value={questionForm.difficulty}
                  onChange={(e) => handleFormChange('difficulty', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="beginner">Beginner (A1-A2)</option>
                  <option value="intermediate">Intermediate (B1-B2)</option>
                  <option value="advanced">Advanced (C1-C2)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Count</label>
                <select
                  value={questionForm.count}
                  onChange={(e) => handleFormChange('count', parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1 Question</option>
                  <option value={3}>3 Questions</option>
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateQuestions}
              disabled={generating}
              className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <span>🚀</span>
                  Generate Questions
                </>
              )}
            </button>

            {/* Generated Questions Display */}
            {generatedQuestions.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-800 mb-3">Generated Questions:</h3>
                <div className="space-y-4">
                  {generatedQuestions.map((question, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="mb-2">
                        <strong className="text-blue-600">Q{index + 1}:</strong> {question.text}
                      </div>
                      <div className="mb-2">
                        <strong>Options:</strong>
                        <ul className="list-disc list-inside ml-4">
                          {question.options.map((option, optIndex) => (
                            <li key={optIndex} className={option === question.correct ? 'text-green-600 font-semibold' : ''}>
                              {option} {option === question.correct && '✓'}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="text-sm text-gray-600 italic">
                        <strong>Explanation:</strong> {question.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500 rounded-lg">
                <span className="text-white text-2xl">👥</span>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-600">{dashboardData.stats.totalUsers}</p>
                <p className="text-sm text-blue-600 font-medium">Total Users</p>
              </div>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{width: '100%'}}></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg p-6 border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500 rounded-lg">
                <span className="text-white text-2xl">🎓</span>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-green-600">{dashboardData.stats.totalStudents}</p>
                <p className="text-sm text-green-600 font-medium">Students</p>
              </div>
            </div>
            <div className="w-full bg-green-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{width: `${dashboardData.stats.totalUsers > 0 ? (dashboardData.stats.totalStudents/dashboardData.stats.totalUsers)*100 : 0}%`}}></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-lg p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500 rounded-lg">
                <span className="text-white text-2xl">📝</span>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-purple-600">{dashboardData.stats.totalExams}</p>
                <p className="text-sm text-purple-600 font-medium">Total Exams</p>
              </div>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{width: '100%'}}></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl shadow-lg p-6 border border-orange-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-500 rounded-lg">
                <span className="text-white text-2xl">📊</span>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-orange-600">{dashboardData.stats.averageScore}</p>
                <p className="text-sm text-orange-600 font-medium">Avg Score</p>
              </div>
            </div>
            <div className="w-full bg-orange-200 rounded-full h-2">
              <div className="bg-orange-600 h-2 rounded-full" style={{width: `${Math.min(dashboardData.stats.averageScore || 0, 100)}%`}}></div>
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData.users.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  dashboardData.users.map((userItem) => (
                    <tr key={userItem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {userItem.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            userItem.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-800'
                              : userItem.role === 'TEACHER'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {userItem.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(userItem.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {userItem.id !== user.id && (
                          <button
                            onClick={() => handleDeleteUser(userItem.id)}
                            disabled={deleting === userItem.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            {deleting === userItem.id ? 'Deleting...' : 'Delete'}
                          </button>
                        )}
                        {userItem.id === user.id && (
                          <span className="text-gray-400 text-xs">(Current user)</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Exams */}
        {dashboardData.recentExams.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg mt-6 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Recent Exams</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CEFR Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dashboardData.recentExams.map((exam) => (
                    <tr key={exam.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {exam.student.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {exam.overallScore || 'N/A'}/100
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {exam.cefrLevel || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(exam.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
