/**
 * Universal API Gateway Management Page
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Slider,
  Box,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  Paper,
  Alert,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  Send as SendIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
  HealthAndSafety as HealthIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

interface Provider {
  id: number;
  name: string;
  displayName: string;
  type: 'webchat' | 'api' | 'proxy';
  enabled: boolean;
  priority: number;
  successRate: number;
  avgResponseTime: number;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  rateLimit: number;
  dailyLimit: number;
  currentUsage: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  provider?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`gateway-tabpanel-${index}`}
      aria-labelledby={`gateway-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Gateway() {
  const [tabValue, setTabValue] = useState(0);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'openai' | 'gemini' | 'claude'>('openai');
  const [selectedProvider, setSelectedProvider] = useState<string>('auto');
  const [chatLoading, setChatLoading] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    const mockProviders: Provider[] = [
      {
        id: 1,
        name: 'zai',
        displayName: 'Z.AI',
        type: 'webchat',
        enabled: true,
        priority: 8,
        successRate: 0.95,
        avgResponseTime: 2000,
        healthStatus: 'healthy',
        rateLimit: 100,
        dailyLimit: 1000,
        currentUsage: 45
      },
      {
        id: 2,
        name: 'grok',
        displayName: 'Grok',
        type: 'webchat',
        enabled: true,
        priority: 9,
        successRate: 0.92,
        avgResponseTime: 1500,
        healthStatus: 'healthy',
        rateLimit: 150,
        dailyLimit: 1500,
        currentUsage: 78
      },
      {
        id: 3,
        name: 'k2think',
        displayName: 'K2Think.AI',
        type: 'webchat',
        enabled: true,
        priority: 7,
        successRate: 0.88,
        avgResponseTime: 2500,
        healthStatus: 'degraded',
        rateLimit: 80,
        dailyLimit: 800,
        currentUsage: 23
      },
      {
        id: 4,
        name: 'codegen',
        displayName: 'Codegen',
        type: 'api',
        enabled: true,
        priority: 10,
        successRate: 0.98,
        avgResponseTime: 1200,
        healthStatus: 'healthy',
        rateLimit: 200,
        dailyLimit: 2000,
        currentUsage: 156
      },
      {
        id: 5,
        name: 'bing',
        displayName: 'Bing Chat',
        type: 'webchat',
        enabled: false,
        priority: 2,
        successRate: 0.75,
        avgResponseTime: 4000,
        healthStatus: 'unhealthy',
        rateLimit: 30,
        dailyLimit: 300,
        currentUsage: 12
      }
    ];

    setTimeout(() => {
      setProviders(mockProviders);
      setLoading(false);
    }, 1000);
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const toggleProvider = (providerId: number) => {
    setProviders(prev => prev.map(p => 
      p.id === providerId ? { ...p, enabled: !p.enabled } : p
    ));
  };

  const updatePriority = (providerId: number, priority: number) => {
    setProviders(prev => prev.map(p => 
      p.id === providerId ? { ...p, priority } : p
    ));
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon color="success" />;
      case 'degraded':
        return <WarningIcon color="warning" />;
      case 'unhealthy':
        return <ErrorIcon color="error" />;
      default:
        return <HealthIcon color="disabled" />;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'unhealthy':
        return 'error';
      default:
        return 'default';
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim()) return;

    setChatLoading(true);
    const userMessage: ChatMessage = {
      role: 'user',
      content: currentMessage,
      timestamp: Date.now()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');

    // Simulate API call
    try {
      const response = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedFormat === 'openai' ? 'gpt-3.5-turbo' : 
                 selectedFormat === 'gemini' ? 'gemini-pro' : 'claude-3-sonnet',
          messages: [{ role: 'user', content: currentMessage }],
          provider_override: selectedProvider !== 'auto' ? selectedProvider : undefined
        })
      });

      const data = await response.json();
      
      let assistantContent = '';
      let providerUsed = selectedProvider !== 'auto' ? selectedProvider : 'auto-selected';

      if (data.choices && data.choices[0]) {
        assistantContent = data.choices[0].message.content;
      } else if (data.candidates && data.candidates[0]) {
        assistantContent = data.candidates[0].content.parts[0].text;
      } else if (data.content && data.content[0]) {
        assistantContent = data.content[0].text;
      } else {
        assistantContent = 'Response received but format not recognized';
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: assistantContent,
        timestamp: Date.now(),
        provider: providerUsed
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: Date.now(),
        provider: 'error'
      };
      setChatMessages(prev => [...prev, errorMessage]);
    }

    setChatLoading(false);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" gutterBottom align="center">
        🚀 Universal API Gateway
      </Typography>
      <Typography variant="h6" color="textSecondary" align="center" gutterBottom>
        Accept any API format • Route to multiple providers • Load balanced & scalable
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab label="🔥 Providers" icon={<SettingsIcon />} />
          <Tab label="🧪 Chat Testing" icon={<SendIcon />} />
          <Tab label="📊 Analytics" icon={<AnalyticsIcon />} />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {providers.map((provider) => (
            <Grid item xs={12} md={6} lg={4} key={provider.id}>
              <Card elevation={3}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box>
                      <Typography variant="h6">{provider.displayName}</Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip 
                          label={provider.type} 
                          size="small" 
                          color={provider.type === 'api' ? 'primary' : 
                                 provider.type === 'webchat' ? 'secondary' : 'default'}
                        />
                        <Chip 
                          icon={getHealthIcon(provider.healthStatus)}
                          label={provider.healthStatus}
                          size="small"
                          color={getHealthColor(provider.healthStatus) as any}
                        />
                      </Box>
                    </Box>
                    <Switch
                      checked={provider.enabled}
                      onChange={() => toggleProvider(provider.id)}
                      color="primary"
                    />
                  </Box>

                  <Box mb={2}>
                    <Typography variant="body2" color="textSecondary">
                      Success Rate: {(provider.successRate * 100).toFixed(1)}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={provider.successRate * 100} 
                      color={provider.successRate > 0.9 ? 'success' : 
                             provider.successRate > 0.8 ? 'warning' : 'error'}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>

                  <Box mb={2}>
                    <Typography variant="body2" color="textSecondary">
                      Avg Response: {provider.avgResponseTime}ms
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Usage: {provider.currentUsage}/{provider.dailyLimit}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Priority: {provider.priority}
                    </Typography>
                    <Slider
                      value={provider.priority}
                      onChange={(_, value) => updatePriority(provider.id, value as number)}
                      min={1}
                      max={10}
                      marks
                      valueLabelDisplay="auto"
                      disabled={!provider.enabled}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ height: 500, display: 'flex', flexDirection: 'column' }}>
              <Box p={2} borderBottom={1} borderColor="divider">
                <Typography variant="h6">💬 Chat Interface</Typography>
              </Box>
              
              <Box flex={1} p={2} overflow="auto">
                {chatMessages.map((msg, idx) => (
                  <Box key={idx} mb={2}>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Chip 
                        label={msg.role} 
                        size="small" 
                        color={msg.role === 'user' ? 'primary' : 'secondary'}
                      />
                      {msg.provider && (
                        <Chip label={msg.provider} size="small" variant="outlined" />
                      )}
                    </Box>
                    <Typography variant="body1" sx={{ 
                      bgcolor: msg.role === 'user' ? 'primary.light' : 'grey.100',
                      p: 1.5,
                      borderRadius: 1,
                      color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary'
                    }}>
                      {msg.content}
                    </Typography>
                  </Box>
                ))}
                {chatLoading && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={20} />
                    <Typography variant="body2" color="textSecondary">
                      AI is thinking...
                    </Typography>
                  </Box>
                )}
              </Box>
              
              <Box p={2} borderTop={1} borderColor="divider">
                <Box display="flex" gap={1}>
                  <TextField
                    fullWidth
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Type your message..."
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    multiline
                    maxRows={3}
                    disabled={chatLoading}
                  />
                  <Button 
                    variant="contained" 
                    onClick={sendMessage}
                    disabled={!currentMessage.trim() || chatLoading}
                    sx={{ minWidth: 80 }}
                  >
                    Send
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>⚙️ Test Settings</Typography>
              
              <Box mb={3}>
                <Typography variant="body2" gutterBottom>Send As Format:</Typography>
                <Box display="flex" gap={1}>
                  {(['openai', 'gemini', 'claude'] as const).map(format => (
                    <Button
                      key={format}
                      variant={selectedFormat === format ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setSelectedFormat(format)}
                    >
                      {format === 'openai' ? 'OpenAI' : 
                       format === 'gemini' ? 'Gemini' : 'Claude'}
                    </Button>
                  ))}
                </Box>
              </Box>
              
              <Box mb={3}>
                <Typography variant="body2" gutterBottom>Provider Override:</Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Button
                    variant={selectedProvider === 'auto' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setSelectedProvider('auto')}
                  >
                    Auto
                  </Button>
                  {providers.filter(p => p.enabled).map(provider => (
                    <Button
                      key={provider.name}
                      variant={selectedProvider === provider.name ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setSelectedProvider(provider.name)}
                    >
                      {provider.displayName}
                    </Button>
                  ))}
                </Box>
              </Box>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  The gateway will automatically detect your API format and route to the best available provider.
                </Typography>
              </Alert>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">Total Requests</Typography>
                <Typography variant="h4">1,247</Typography>
                <Typography variant="body2" color="success.main">+12% today</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">Success Rate</Typography>
                <Typography variant="h4">94.2%</Typography>
                <Typography variant="body2" color="success.main">+2.1% today</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">Avg Response</Typography>
                <Typography variant="h4">1.8s</Typography>
                <Typography variant="body2" color="warning.main">+0.2s today</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">Active Providers</Typography>
                <Typography variant="h4">{providers.filter(p => p.enabled).length}</Typography>
                <Typography variant="body2" color="textSecondary">of {providers.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Container>
  );
}
