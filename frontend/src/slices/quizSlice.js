import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  currentQuiz: null,       // quiz data (questions without answers)
  userAnswers: [],         // selected option index per question
  quizResult: null,        // result after submission
  loading: false,
}

const quizSlice = createSlice({
  name: "quiz",
  initialState,
  reducers: {
    setCurrentQuiz: (state, action) => {
      state.currentQuiz = action.payload
      state.userAnswers = new Array(action.payload?.questions?.length || 0).fill(-1)
      state.quizResult = null
    },
    setUserAnswer: (state, action) => {
      const { index, answer } = action.payload
      state.userAnswers[index] = answer
    },
    setQuizResult: (state, action) => {
      state.quizResult = action.payload
    },
    setQuizLoading: (state, action) => {
      state.loading = action.payload
    },
    resetQuiz: (state) => {
      state.currentQuiz = null
      state.userAnswers = []
      state.quizResult = null
      state.loading = false
    },
  },
})

export const {
  setCurrentQuiz,
  setUserAnswer,
  setQuizResult,
  setQuizLoading,
  resetQuiz,
} = quizSlice.actions

export default quizSlice.reducer
