import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useParams } from "react-router-dom"

import { loadQuiz, loadQuizResult, submitQuiz } from "../../../services/operations/quizAPI"
import { setUserAnswer, resetQuiz } from "../../../slices/quizSlice"
import { setCourseViewSidebar } from "../../../slices/sidebarSlice"

import { HiMenuAlt1 } from "react-icons/hi"
import { MdCheckCircle, MdCancel } from "react-icons/md"


export default function QuizView() {
  const { courseId, sectionId, quizId } = useParams()
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { currentQuiz, userAnswers, quizResult, loading } = useSelector((state) => state.quiz)
  const { courseViewSidebar } = useSelector((state) => state.sidebar)

  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    dispatch(resetQuiz())
    setCurrentQuestion(0)
    setSubmitted(false)
    // Try to load existing result first, then load the quiz
    dispatch(loadQuizResult(quizId, token)).then(() => {
      dispatch(loadQuiz(quizId, token))
    })
  }, [quizId])

  // If user already has a result, show it
  useEffect(() => {
    if (quizResult) setSubmitted(true)
  }, [quizResult])

  const handleSelectAnswer = (questionIndex, optionIndex) => {
    if (submitted) return
    dispatch(setUserAnswer({ index: questionIndex, answer: optionIndex }))
  }

  const handleSubmit = () => {
    if (userAnswers.includes(-1)) {
      const unanswered = userAnswers.filter((a) => a === -1).length
      if (!window.confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) return
    }
    dispatch(submitQuiz({ quizId, courseId, sectionId, answers: userAnswers }, token))
    setSubmitted(true)
  }

  const handleRetake = () => {
    dispatch(resetQuiz())
    setCurrentQuestion(0)
    setSubmitted(false)
    dispatch(loadQuiz(quizId, token))
  }

  if (courseViewSidebar && window.innerWidth <= 640) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-white">
        <p>Loading quiz...</p>
      </div>
    )
  }

  if (!currentQuiz) {
    return (
      <div className="flex items-center justify-center h-64 text-white">
        <p>Quiz not found.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 text-white pb-10">

      {/* Sidebar toggle for small screens */}
      <div
        className="sm:hidden text-white absolute left-7 top-3 cursor-pointer"
        onClick={() => dispatch(setCourseViewSidebar(!courseViewSidebar))}
      >
        {!courseViewSidebar && <HiMenuAlt1 size={33} />}
      </div>

      {/* Quiz Header */}
      <div className="mt-4">
        <h1 className="text-3xl font-semibold">{currentQuiz.title}</h1>
        {currentQuiz.description && (
          <p className="mt-2 text-richblack-300">{currentQuiz.description}</p>
        )}
        <p className="mt-1 text-sm text-richblack-400">
          {currentQuiz.questions.length} questions &bull; Passing score: {currentQuiz.passingScore}%
        </p>
      </div>

      {/* ---- RESULT VIEW ---- */}
      {submitted && quizResult ? (
        <div className="flex flex-col gap-6">

          {/* Score Card */}
          <div className={`rounded-xl p-6 text-center ${quizResult.passed ? 'bg-green-900/40 border border-green-500' : 'bg-red-900/40 border border-red-500'}`}>
            <p className="text-5xl font-bold mb-2">{quizResult.score}%</p>
            <p className={`text-xl font-semibold ${quizResult.passed ? 'text-green-400' : 'text-red-400'}`}>
              {quizResult.passed ? "Passed!" : "Not Passed"}
            </p>
            <p className="mt-2 text-richblack-300">
              {quizResult.correctAnswers} / {quizResult.totalQuestions} correct &bull; Passing: {quizResult.passingScore}%
            </p>
            <button
              onClick={handleRetake}
              className="mt-4 rounded-lg bg-yellow-50 px-6 py-2 font-semibold text-richblack-900 hover:bg-yellow-25 transition-all"
            >
              Retake Quiz
            </button>
          </div>

          {/* Per-question Feedback */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold">Review Answers</h2>
            {quizResult.feedback.map((item, idx) => (
              <div
                key={idx}
                className={`rounded-lg border p-4 ${item.isCorrect ? 'border-green-600 bg-green-900/20' : 'border-red-600 bg-red-900/20'}`}
              >
                <div className="flex items-start gap-2 mb-3">
                  {item.isCorrect
                    ? <MdCheckCircle className="text-green-400 mt-1 shrink-0" size={20} />
                    : <MdCancel className="text-red-400 mt-1 shrink-0" size={20} />
                  }
                  <p className="font-medium">Q{idx + 1}. {item.questionText}</p>
                </div>
                <div className="flex flex-col gap-1 pl-7">
                  {item.options.map((opt, oIdx) => (
                    <div
                      key={oIdx}
                      className={`rounded-md px-3 py-1.5 text-sm ${
                        oIdx === item.correctAnswer
                          ? 'bg-green-700/50 text-green-200 font-semibold'
                          : oIdx === item.selectedAnswer && !item.isCorrect
                          ? 'bg-red-700/50 text-red-200'
                          : 'text-richblack-300'
                      }`}
                    >
                      {oIdx === item.correctAnswer && <span className="mr-1">[Correct]</span>}
                      {oIdx === item.selectedAnswer && oIdx !== item.correctAnswer && <span className="mr-1">[Your Answer]</span>}
                      {opt}
                    </div>
                  ))}
                </div>
                {item.explanation && (
                  <p className="mt-2 pl-7 text-sm text-richblack-300 italic">
                    {item.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

      ) : (
        /* ---- QUIZ TAKING VIEW ---- */
        <div className="flex flex-col gap-6">

          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-richblack-700 rounded-full overflow-hidden">
              <div
                className="h-2 bg-yellow-50 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / currentQuiz.questions.length) * 100}%` }}
              />
            </div>
            <span className="text-sm text-richblack-400 shrink-0">
              {currentQuestion + 1} / {currentQuiz.questions.length}
            </span>
          </div>

          {/* Question */}
          <div className="rounded-xl bg-richblack-800 p-6">
            <p className="text-lg font-semibold mb-5">
              Q{currentQuestion + 1}. {currentQuiz.questions[currentQuestion].questionText}
            </p>
            <div className="flex flex-col gap-3">
              {currentQuiz.questions[currentQuestion].options.map((opt, oIdx) => (
                <button
                  key={oIdx}
                  onClick={() => handleSelectAnswer(currentQuestion, oIdx)}
                  className={`text-left rounded-lg border px-4 py-3 transition-all ${
                    userAnswers[currentQuestion] === oIdx
                      ? 'border-yellow-50 bg-yellow-50/10 text-yellow-50 font-semibold'
                      : 'border-richblack-600 hover:border-richblack-400 text-richblack-200'
                  }`}
                >
                  <span className="mr-2 font-bold">
                    {String.fromCharCode(65 + oIdx)}.
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              disabled={currentQuestion === 0}
              onClick={() => setCurrentQuestion((q) => q - 1)}
              className="rounded-lg border border-richblack-600 px-5 py-2 text-sm font-medium disabled:opacity-40 hover:bg-richblack-700 transition-all"
            >
              Previous
            </button>

            {/* Question dots */}
            <div className="hidden sm:flex gap-1.5 flex-wrap justify-center max-w-[300px]">
              {currentQuiz.questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQuestion(idx)}
                  className={`h-7 w-7 rounded-full text-xs font-bold transition-all ${
                    idx === currentQuestion
                      ? 'bg-yellow-50 text-richblack-900'
                      : userAnswers[idx] !== -1
                      ? 'bg-richblack-500 text-white'
                      : 'bg-richblack-700 text-richblack-300'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            {currentQuestion < currentQuiz.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestion((q) => q + 1)}
                className="rounded-lg bg-richblack-700 px-5 py-2 text-sm font-medium hover:bg-richblack-600 transition-all"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="rounded-lg bg-yellow-50 px-5 py-2 text-sm font-semibold text-richblack-900 hover:bg-yellow-25 transition-all disabled:opacity-60"
              >
                {loading ? "Submitting..." : "Submit Quiz"}
              </button>
            )}
          </div>

          {/* Answered count */}
          <p className="text-sm text-richblack-400 text-center">
            {userAnswers.filter((a) => a !== -1).length} / {currentQuiz.questions.length} answered
          </p>

          {/* Submit button also at bottom if not on last question */}
          {currentQuestion < currentQuiz.questions.length - 1 && (
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="rounded-lg bg-yellow-50 px-6 py-2 text-sm font-semibold text-richblack-900 hover:bg-yellow-25 transition-all disabled:opacity-60"
              >
                {loading ? "Submitting..." : "Submit Quiz"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
