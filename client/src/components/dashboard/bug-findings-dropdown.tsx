'use client';

import { useState } from 'react';
import { Bug, ExternalLink, AlertTriangle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { AgentRun, BugFinding } from '@/types/bug';
import { SlamOnView } from '@/components/ui/slam-on-view';

interface BugFindingsDropdownProps {
  run: AgentRun;
  trigger?: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

export function BugFindingsDropdown({ 
  run, 
  trigger, 
  className = '', 
  align = 'start' 
}: BugFindingsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);


  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="flex items-center space-x-1">
            <span>View Bug Findings</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align={align}
        className={`w-[95vw] sm:w-[90vw] lg:w-[1200px] 2xl:w-[1400px] max-h-[80vh] overflow-y-auto p-0 ${className}`}
      >
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Bug className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Bug Findings - {run.targetUrl}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Detailed analysis of security vulnerabilities found during the audit
          </p>

          <div className="space-y-6">
            {run.bugFindings.length === 0 ? (
              <div className="text-center py-8">
                <Bug className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No bugs found in this audit</p>
              </div>
            ) : (
              run.bugFindings.map((finding, index) => (
                <Card key={finding.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">
                          {finding.title}
                        </CardTitle>
                        <p className="text-muted-foreground mb-4">
                          {finding.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Reproduction Steps:</h4>
                      <div className="space-y-3">
                        {finding.reproduction_steps.map((step, stepIndex) => (
                          <div key={stepIndex} className="flex items-start space-x-3 p-3 border rounded-lg bg-muted/30">
                            <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                              {step.step_number}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-foreground mb-2">{step.text}</p>
                              <img 
                                src={step.image_url} 
                                alt={`Step ${step.step_number} screenshot`}
                                className="w-full max-w-sm h-24 object-cover rounded border"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <SlamOnView>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-900/20 dark:border-yellow-800 roast-trigger">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-yellow-800 mb-1 dark:text-yellow-300">
                              Roast Message
                            </h4>
                        <p className="text-yellow-700 text-sm dark:text-yellow-200">
                          {finding.roast}
                        </p>
                          </div>
                        </div>
                      </div>
                    </SlamOnView>



                    {index < run.bugFindings.length - 1 && (
                      <Separator className="my-4" />
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
