'use client';

import { useState, useEffect } from 'react';
import { Bug, CheckCircle, Edit, Loader2, Plus, Save, Trash2, X, XCircle } from 'lucide-react';
import { AgentRun, BugFinding } from '@/types/bug';
import { bugApi } from '@/lib/api';
import { mockUsers } from '@/lib/mock-data';
import { useAuthStore } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

interface BugFindingsCollapsibleProps {
  run: AgentRun;
  // Callback to notify the parent component to refetch data
  onDataChange?: () => void;
}

export function BugFindingsCollapsible({ run, onDataChange }: BugFindingsCollapsibleProps) {
  const [bugFindings, setBugFindings] = useState<BugFinding[]>(run.bugFindings);
  const [originalBugOnEdit, setOriginalBugOnEdit] = useState<BugFinding | null>(null);
  // State to track which bug is currently being processed by an API call
  const [processingBugId, setProcessingBugId] = useState<string | null>(null);
  
  const currentUser = useAuthStore((state) => state.user);

  // This effect syncs the component's state if the parent passes down new data
  useEffect(() => {
    setBugFindings(run.bugFindings);
  }, [run.bugFindings]);

  const getUserName = (userId: string) => {
    const user = mockUsers.find(u => u.id === userId);
    return user?.name || userId;
  };

  const getUser = (userId: string) => {
    return mockUsers.find(u => u.id === userId);
  };

  // --- API-Integrated Handlers ---

  const handleConfirmBug = async (bugId: string) => {
    setProcessingBugId(bugId);
    try {
      await bugApi.updateBugFinding(bugId, {
        status: 'confirmed',
        reviewer_auth0Id: currentUser?.auth0Id || 'unknown-reviewer',
      });
      // On success, trigger the parent's refetch function
      onDataChange?.(); 
      // refresh page
      window.location.reload();
    } catch (error) {
      console.error("Failed to confirm bug:", error);
      // Optional: Add user feedback like a toast notification on error
    } finally {
      setProcessingBugId(null);
    }
  };

  const handleRejectBug = async (bugId: string) => {
    setProcessingBugId(bugId);
    try {
      await bugApi.deleteBugFinding(bugId);
      // On success, trigger the parent's refetch function
      onDataChange?.();
      window.location.reload();
    } catch (error) {
      console.error("Failed to reject (delete) bug:", error);
    } finally {
      setProcessingBugId(null);
    }
  };

  const handleSaveBug = async (bugId: string) => {
    const bugToSave = bugFindings.find(bug => bug.id === bugId);
    if (!bugToSave) return;

    setProcessingBugId(bugId);
    try {
      const { title, description, roast, reproduction_steps } = bugToSave;
      await bugApi.updateBugFinding(bugId, {
        title,
        description,
        roast,
        reproduction_steps,
        reviewer_auth0Id: currentUser?.auth0Id || 'unknown-reviewer',
      });
      setOriginalBugOnEdit(null);
      // On success, trigger the parent's refetch function
      onDataChange?.();
    } catch (error) {
      console.error("Failed to save bug:", error);
    } finally {
      // The refetch will handle exiting edit mode, but we clear the processing state
      setProcessingBugId(null);
    }
  };

  // --- Local UI State Handlers ---

  const handleResetBug = (bugId: string) => {
    // This is a local-only action, no API call needed. Parent will be notified on save.
    setBugFindings(prev =>
      prev.map(bug =>
        bug.id === bugId ? { ...bug, status: 'pending' as const } : bug
      )
    );
  };

  const handleEditBug = (bugId: string) => {
    const bugToEdit = bugFindings.find(bug => bug.id === bugId);
    if (bugToEdit) {
      // Deep copy to prevent mutation issues before saving
      setOriginalBugOnEdit(JSON.parse(JSON.stringify(bugToEdit)));
      setBugFindings(prev =>
        prev.map(bug =>
          bug.id === bugId ? { ...bug, isEditing: true } : bug
        )
      );
    }
  };

  const handleCancelEdit = (bugId: string) => {
    if (originalBugOnEdit) {
      setBugFindings(prev =>
        prev.map(bug => (bug.id === bugId ? originalBugOnEdit : bug))
      );
      setOriginalBugOnEdit(null);
    }
  };
  
  const handleFieldChange = (bugId: string, field: keyof BugFinding, value: any) => {
    setBugFindings(prev =>
      prev.map(bug =>
        bug.id === bugId ? { ...bug, [field]: value } : bug
      )
    );
  };

  const handleAddStep = (bugId: string) => {
    setBugFindings(prev =>
      prev.map(bug =>
        bug.id === bugId
          ? {
              ...bug,
              reproduction_steps: [
                ...(bug.reproduction_steps || []),
                {
                  step_number: (bug.reproduction_steps || []).length + 1,
                  text: '',
                  image_url: '',
                },
              ],
            }
          : bug
      )
    );
  };

  const handleRemoveStep = (bugId: string, stepIndex: number) => {
    setBugFindings(prev =>
      prev.map(bug =>
        bug.id === bugId
          ? {
              ...bug,
              reproduction_steps: (bug.reproduction_steps || [])
                .filter((_, index) => index !== stepIndex)
                .map((step, index) => ({ ...step, step_number: index + 1 })),
            }
          : bug
      )
    );
  };

  const handleUpdateStep = (bugId: string, stepIndex: number, field: 'text' | 'image_url', value: string) => {
    setBugFindings(prev =>
      prev.map(bug =>
        bug.id === bugId
          ? {
              ...bug,
              reproduction_steps: (bug.reproduction_steps || []).map((step, index) =>
                index === stepIndex ? { ...step, [field]: value } : step
              ),
            }
          : bug
      )
    );
  };

  return (
    <div className="py-2 px-3">
      <div className="flex items-center space-x-2 mb-2">
        <Bug className="h-4 w-4" />
        <h3 className="text-base font-semibold">Bug Findings - {run.targetUrl}</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Detailed analysis of security vulnerabilities found during the audit
      </p>

      <div className="space-y-6">
        {bugFindings.length === 0 ? (
          <div className="text-center py-3">
            <Bug className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
            <p className="text-sm text-muted-foreground">No bugs found in this audit</p>
          </div>
        ) : (
          bugFindings.map((finding, index) => {
            const isProcessing = processingBugId === finding.id;
            return (
              <Card key={finding.id} className="border-l-4 border-l-red-200">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {finding.isEditing ? (
                        <div className="space-y-3">
                          <Input
                            value={finding.title}
                            onChange={(e) => handleFieldChange(finding.id, 'title', e.target.value)}
                            placeholder="Bug title"
                            className="text-base font-semibold"
                            disabled={isProcessing}
                          />
                          <Textarea
                            value={finding.description}
                            onChange={(e) => handleFieldChange(finding.id, 'description', e.target.value)}
                            placeholder="Bug description"
                            className="text-sm"
                            rows={3}
                            disabled={isProcessing}
                          />
                        </div>
                      ) : (
                        <>
                          <CardTitle className="text-base mb-1">{finding.title}</CardTitle>
                          <p className="text-sm text-muted-foreground mb-2">{finding.description}</p>
                        </>
                      )}
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-xs text-muted-foreground">Audit created by:</span>
                        {run.createdBy ? (
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={getUser(run.createdBy)?.picture} alt={getUserName(run.createdBy)} />
                              <AvatarFallback className="text-xs">
                                {getUserName(run.createdBy).split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <Badge variant="secondary" className="text-xs">{getUserName(run.createdBy)}</Badge>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Unknown</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 dark:bg-yellow-900/20 dark:border-yellow-800 animate-slam -mt-4 roast-trigger">
                    <div className="flex items-start space-x-2">
                      <Bug className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-yellow-800 mb-1 dark:text-yellow-300 text-sm">Roast Message</h4>
                        {finding.isEditing ? (
                          <Textarea
                            value={finding.roast}
                            onChange={(e) => handleFieldChange(finding.id, 'roast', e.target.value)}
                            placeholder="Roast message"
                            className="text-yellow-700 text-sm dark:text-yellow-200 bg-transparent border-yellow-300"
                            rows={3}
                            disabled={isProcessing}
                          />
                        ) : (
                          <p className="text-yellow-700 text-sm dark:text-yellow-200">{finding.roast}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-1 text-sm">Reproduction Steps:</h4>
                    <div className="space-y-4">
                      {(finding.reproduction_steps || []).map((step, stepIndex) => (
                        <div key={stepIndex} className="flex items-start space-x-3 p-3 border rounded-lg bg-muted/30">
                          <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                            {step.step_number}
                          </div>
                          <div className="flex-1">
                            {finding.isEditing ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={step.text}
                                  onChange={(e) => handleUpdateStep(finding.id, stepIndex, 'text', e.target.value)}
                                  placeholder="Step description"
                                  className="text-sm"
                                  rows={2}
                                  disabled={isProcessing}
                                />
                                <Input
                                  value={step.image_url}
                                  onChange={(e) => handleUpdateStep(finding.id, stepIndex, 'image_url', e.target.value)}
                                  placeholder="Image URL"
                                  className="text-sm"
                                  disabled={isProcessing}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRemoveStep(finding.id, stepIndex)}
                                  className="flex items-center space-x-1 text-destructive hover:text-destructive"
                                  disabled={isProcessing}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span>Remove Step</span>
                                </Button>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm text-foreground mb-2">{step.text}</p>
                                <img
                                  src={step.image_url}
                                  alt={`Step ${step.step_number} screenshot`}
                                  className="w-full max-w-md h-48 object-cover rounded border"
                                />
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                      {finding.isEditing && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddStep(finding.id)}
                          className="flex items-center space-x-1 w-full"
                          disabled={isProcessing}
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add Step</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-3 border-t">
                    <Button
                      size="sm"
                      variant={finding.status === 'confirmed' ? 'default' : 'outline'}
                      onClick={() => handleConfirmBug(finding.id)}
                      disabled={isProcessing}
                      className={`flex items-center space-x-1 ${
                        finding.status === 'confirmed'
                          ? 'bg-green-600 border-green-600 text-white hover:bg-green-700 hover:border-green-700'
                          : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300'
                      }`}
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      <span>Confirm</span>
                    </Button>
                    <Button
                      size="sm"
                      variant={finding.status === 'rejected' ? 'destructive' : 'outline'}
                      onClick={() => handleRejectBug(finding.id)}
                      disabled={isProcessing}
                      className={`flex items-center space-x-1 ${
                        finding.status === 'rejected' 
                          ? 'bg-red-500 border-red-500 text-white hover:bg-red-600 hover:border-red-600'
                          : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300'
                      }`}
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      <span>Reject</span>
                    </Button>
                    {finding.status !== 'pending' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResetBug(finding.id)}
                        disabled={isProcessing}
                        className="flex items-center space-x-1 text-muted-foreground"
                      >
                        <span>Reset</span>
                      </Button>
                    )}
                    {finding.isEditing ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSaveBug(finding.id)}
                          disabled={isProcessing}
                          className="flex items-center space-x-1"
                        >
                          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          <span>Save</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelEdit(finding.id)}
                          disabled={isProcessing}
                          className="flex items-center space-x-1"
                        >
                          <X className="h-4 w-4" />
                          <span>Cancel</span>
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditBug(finding.id)}
                        disabled={isProcessing}
                        className="flex items-center space-x-1"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Edit</span>
                      </Button>
                    )}
                  </div>

                  {index < bugFindings.length - 1 && (
                    <Separator className="my-2" />
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}