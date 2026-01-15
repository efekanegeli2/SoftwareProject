import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_URL = 'http://localhost:3000';

const TeacherPanel = () => {
  const { user, logout } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/teacher`);
      setStudents(response.data);
    } catch (error) {
      console.error('Error loading students:', error);
      alert('Failed to load students. Please try again.');
    }
    setLoading(false);
  };

  const handleViewDetails = async (studentId) => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/teacher/student/${studentId}`);
      setStudentDetails(response.data);
      setShowModal(true);
    } catch (error) {
      console.error('Error loading student details:', error);
      alert('Failed to load student details. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Teacher Dashboard</h1>
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

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Exams
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Latest Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Latest CEFR Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      No students found
                    </td>
                  </tr>
                ) : (
                  students.map((student) => {
                    const latestExam = student.exams[0];
                    return (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {student.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.exams.length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {latestExam?.overallScore !== null && latestExam?.overallScore !== undefined
                            ? `${latestExam.overallScore}/100`
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {latestExam?.cefrLevel || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleViewDetails(student.id)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Student Details Modal */}
      {showModal && studentDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  Student Details: {studentDetails.email}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {studentDetails.exams.length === 0 ? (
                  <p className="text-gray-500">No exams taken yet.</p>
                ) : (
                  studentDetails.exams.map((exam) => (
                    <div key={exam.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-800">Exam #{exam.id.slice(0, 8)}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(exam.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Score: {exam.overallScore || 'N/A'}/100</p>
                          <p className="text-sm text-gray-600">CEFR: {exam.cefrLevel || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {exam.answers.map((answer, index) => (
                          <div key={answer.id} className="bg-gray-50 rounded p-3">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-medium text-gray-600 bg-blue-100 px-2 py-1 rounded">
                                {answer.type}
                              </span>
                              {answer.aiScore !== null && (
                                <span className="text-xs text-gray-600">
                                  Score: {answer.aiScore}
                                </span>
                              )}
                            </div>
                            {answer.questionText && (
                              <p className="text-sm font-medium text-gray-700 mb-1">
                                {answer.questionText}
                              </p>
                            )}
                            <p className="text-sm text-gray-800 whitespace-pre-wrap">
                              {answer.userResponse}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherPanel;
