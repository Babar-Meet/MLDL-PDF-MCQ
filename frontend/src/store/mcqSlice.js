import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  uploadFiles as uploadFilesApi,
  generateMCQs as generateMCQsApi,
  generateMCQsFromText as generateMCQsFromTextApi,
  getUserQuota,
  upgradeToPaid as upgradeToPaidApi,
} from '../services/api';

// Initial state
const initialState = {
  currentGeneration: {
    status: 'idle', // idle, uploading, generating, completed, error
    progress: 0,
    message: '',
    extractedText: null,
    chunks: [],
  },
  generatedMCQs: [],
  quota: null,
  loading: false,
  error: null,
};

// Async thunks
export const uploadFiles = createAsyncThunk(
  'mcq/uploadFiles',
  async ({ files, provider, apiKey }, { rejectWithValue }) => {
    try {
      const data = await uploadFilesApi(files, provider, apiKey);
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const generateMCQs = createAsyncThunk(
  'mcq/generate',
  async (data, { rejectWithValue }) => {
    try {
      const response = await generateMCQsApi(data);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const generateMCQsFromText = createAsyncThunk(
  'mcq/generateFromText',
  async (data, { rejectWithValue }) => {
    try {
      const response = await generateMCQsFromTextApi(data);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchUserQuota = createAsyncThunk(
  'mcq/fetchQuota',
  async (_, { rejectWithValue }) => {
    try {
      const data = await getUserQuota();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const upgradeToPaid = createAsyncThunk(
  'mcq/upgrade',
  async (_, { rejectWithValue }) => {
    try {
      const data = await upgradeToPaidApi();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const mcqSlice = createSlice({
  name: 'mcq',
  initialState,
  reducers: {
    setUploading: (state, action) => {
      state.currentGeneration.status = 'uploading';
      state.currentGeneration.progress = 0;
      state.currentGeneration.message = 'Uploading files...';
      state.error = null;
    },
    setGenerating: (state, action) => {
      state.currentGeneration.status = 'generating';
      state.currentGeneration.progress = action.payload?.progress || 50;
      state.currentGeneration.message = action.payload?.message || 'Generating MCQs...';
    },
    updateProgress: (state, action) => {
      state.currentGeneration.progress = action.payload.progress;
      state.currentGeneration.message = action.payload.message;
    },
    setGenerationComplete: (state, action) => {
      state.currentGeneration.status = 'completed';
      state.currentGeneration.progress = 100;
      state.currentGeneration.message = 'MCQs generated successfully!';
      state.generatedMCQs = action.payload || [];
    },
    setGenerationError: (state, action) => {
      state.currentGeneration.status = 'error';
      state.error = action.payload;
    },
    resetGeneration: (state) => {
      state.currentGeneration = {
        status: 'idle',
        progress: 0,
        message: '',
        extractedText: null,
        chunks: [],
      };
      state.error = null;
    },
    clearGeneratedMCQs: (state) => {
      state.generatedMCQs = [];
      state.currentGeneration = {
        status: 'idle',
        progress: 0,
        message: '',
        extractedText: null,
        chunks: [],
      };
    },
    clearMCQError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Upload Files
      .addCase(uploadFiles.pending, (state) => {
        state.currentGeneration.status = 'uploading';
        state.currentGeneration.progress = 0;
        state.currentGeneration.message = 'Uploading files...';
        state.error = null;
      })
      .addCase(uploadFiles.fulfilled, (state, action) => {
        state.currentGeneration.status = 'uploading';
        state.currentGeneration.progress = 100;
        state.currentGeneration.message = 'Files uploaded successfully!';
        state.currentGeneration.extractedText = action.payload.text || action.payload.extracted_text || null;
        state.currentGeneration.chunks = action.payload.chunks || [];
      })
      .addCase(uploadFiles.rejected, (state, action) => {
        state.currentGeneration.status = 'error';
        state.error = action.payload;
      })
      // Generate MCQs
      .addCase(generateMCQs.pending, (state) => {
        state.currentGeneration.status = 'generating';
        state.currentGeneration.progress = 0;
        state.currentGeneration.message = 'Generating MCQs...';
        state.error = null;
      })
      .addCase(generateMCQs.fulfilled, (state, action) => {
        state.currentGeneration.status = 'completed';
        state.currentGeneration.progress = 100;
        state.currentGeneration.message = 'MCQs generated successfully!';
        state.generatedMCQs = action.payload.mcqs || action.payload.questions || [];
      })
      .addCase(generateMCQs.rejected, (state, action) => {
        state.currentGeneration.status = 'error';
        state.error = action.payload;
      })
      // Generate from Text
      .addCase(generateMCQsFromText.pending, (state) => {
        state.currentGeneration.status = 'generating';
        state.currentGeneration.progress = 0;
        state.currentGeneration.message = 'Generating MCQs from text...';
        state.error = null;
      })
      .addCase(generateMCQsFromText.fulfilled, (state, action) => {
        state.currentGeneration.status = 'completed';
        state.currentGeneration.progress = 100;
        state.currentGeneration.message = 'MCQs generated successfully!';
        state.generatedMCQs = action.payload.mcqs || action.payload.questions || [];
      })
      .addCase(generateMCQsFromText.rejected, (state, action) => {
        state.currentGeneration.status = 'error';
        state.error = action.payload;
      })
      // Fetch Quota
      .addCase(fetchUserQuota.fulfilled, (state, action) => {
        state.quota = action.payload;
      })
      // Upgrade to Paid
      .addCase(upgradeToPaid.fulfilled, (state, action) => {
        state.quota = action.payload;
      });
  },
});

export const {
  setUploading,
  setGenerating,
  updateProgress,
  setGenerationComplete,
  setGenerationError,
  resetGeneration,
  clearGeneratedMCQs,
  clearMCQError,
} = mcqSlice.actions;

// Selectors
export const selectCurrentGeneration = (state) => state.mcq.currentGeneration;
export const selectGenerationStatus = (state) => state.mcq.currentGeneration.status;
export const selectGenerationProgress = (state) => state.mcq.currentGeneration.progress;
export const selectGeneratedMCQs = (state) => state.mcq.generatedMCQs;
export const selectQuota = (state) => state.mcq.quota;
export const selectMCQLoading = (state) => state.mcq.loading;
export const selectMCQError = (state) => state.mcq.error;

export default mcqSlice.reducer;
