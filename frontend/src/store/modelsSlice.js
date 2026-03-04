import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getAllModels,
  getAvailableModels,
  saveApiKey as saveApiKeyApi,
  getApiKey as getApiKeyApi,
  saveLastUsed as saveLastUsedApi,
  getLastUsed as getLastUsedApi,
  createModel as createModelApi,
  updateModel as updateModelApi,
  deleteModel as deleteModelApi,
} from "../services/api";

// Initial state
const initialState = {
  models: [],
  availableModels: [],
  selectedModel: null,
  loading: false,
  error: null,
  apiKeys: {},
  lastUsed: null,
};

// Async thunks
export const fetchAllModels = createAsyncThunk(
  "models/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const data = await getAllModels();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchAvailableModels = createAsyncThunk(
  "models/fetchAvailable",
  async (_, { rejectWithValue }) => {
    try {
      const data = await getAvailableModels();
      console.log("API Response for available models:", data);
      return data;
    } catch (error) {
      console.error("Error fetching available models:", error);
      // Return more detailed error information
      return rejectWithValue({
        message: error.message || "Failed to fetch available models",
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  },
);

export const saveApiKey = createAsyncThunk(
  "models/saveApiKey",
  async ({ provider, apiKey }, { rejectWithValue }) => {
    try {
      await saveApiKeyApi(provider, apiKey);
      return { provider, apiKey };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchApiKey = createAsyncThunk(
  "models/fetchApiKey",
  async (provider, { rejectWithValue }) => {
    try {
      const data = await getApiKeyApi(provider);
      return { provider, hasKey: !!data.api_key };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const saveLastUsed = createAsyncThunk(
  "models/saveLastUsed",
  async ({ provider, model }, { rejectWithValue }) => {
    try {
      await saveLastUsedApi(provider, model);
      return { provider, model };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchLastUsed = createAsyncThunk(
  "models/fetchLastUsed",
  async (_, { rejectWithValue }) => {
    try {
      const data = await getLastUsedApi();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// Create model (admin)
export const createModel = createAsyncThunk(
  "models/create",
  async (modelData, { rejectWithValue }) => {
    try {
      const data = await createModelApi(modelData);
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// Update model (admin)
export const updateModel = createAsyncThunk(
  "models/update",
  async ({ modelId, modelData }, { rejectWithValue }) => {
    try {
      const data = await updateModelApi(modelId, modelData);
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// Delete model (admin)
export const deleteModel = createAsyncThunk(
  "models/delete",
  async (modelId, { rejectWithValue }) => {
    try {
      await deleteModelApi(modelId);
      return modelId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

const modelsSlice = createSlice({
  name: "models",
  initialState,
  reducers: {
    setSelectedModel: (state, action) => {
      state.selectedModel = action.payload;
    },
    clearModelsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch All Models
      .addCase(fetchAllModels.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllModels.fulfilled, (state, action) => {
        state.loading = false;
        state.models = action.payload;
      })
      .addCase(fetchAllModels.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Available Models
      .addCase(fetchAvailableModels.pending, (state) => {
        state.loading = true;
        state.error = null;
        console.log("Fetching available models...");
      })
      .addCase(fetchAvailableModels.fulfilled, (state, action) => {
        state.loading = false;
        console.log("Models fetched successfully, payload:", action.payload);
        
        // Handle different response structures
        if (action.payload && action.payload.models) {
          state.availableModels = action.payload.models;
        } else if (Array.isArray(action.payload)) {
          state.availableModels = action.payload;
        } else if (action.payload && action.payload.data) {
          state.availableModels = Array.isArray(action.payload.data) ? action.payload.data : (action.payload.data.models || []);
        } else {
          console.warn("Unexpected payload structure:", action.payload);
          state.availableModels = [];
        }
      })
      .addCase(fetchAvailableModels.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || action.payload || "Failed to load models";
        console.error("Failed to fetch models, error:", action.payload);
      })
      // Save API Key
      .addCase(saveApiKey.fulfilled, (state, action) => {
        state.apiKeys[action.payload.provider] = action.payload.apiKey;
      })
      // Fetch Last Used
      .addCase(fetchLastUsed.fulfilled, (state, action) => {
        state.lastUsed = action.payload;
      })
      // Create Model
      .addCase(createModel.fulfilled, (state, action) => {
        state.models.push(action.payload);
      })
      // Update Model
      .addCase(updateModel.fulfilled, (state, action) => {
        const index = state.models.findIndex(
          (m) => m._id === action.payload._id,
        );
        if (index !== -1) {
          state.models[index] = action.payload;
        }
      })
      // Delete Model
      .addCase(deleteModel.fulfilled, (state, action) => {
        state.models = state.models.filter((m) => m._id !== action.payload);
      });
  },
});

export const { setSelectedModel, clearModelsError } = modelsSlice.actions;

// Selectors
export const selectModels = (state) => state.models.models;
export const selectAvailableModels = (state) => state.models.availableModels;
export const selectSelectedModel = (state) => state.models.selectedModel;
export const selectModelsLoading = (state) => state.models.loading;
export const selectModelsError = (state) => state.models.error;
export const selectLastUsed = (state) => state.models.lastUsed;

export default modelsSlice.reducer;
