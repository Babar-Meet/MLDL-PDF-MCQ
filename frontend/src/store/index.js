import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import modelsReducer from './modelsSlice';
import mcqReducer from './mcqSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    models: modelsReducer,
    mcq: mcqReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these paths in the state
        ignoredActions: ['auth/loginUser/fulfilled', 'auth/registerUser/fulfilled'],
      },
    }),
});

export default store;
