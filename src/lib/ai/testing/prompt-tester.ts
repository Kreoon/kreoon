import { supabase } from "@/integrations/supabase/client";

export interface PromptTestCase {
  id: string;
  promptId: string;
  name: string;
  description: string;

  input: {
    variables: Record<string, unknown>;
    context?: {
      organizationId?: string;
      productId?: string;
      campaignId?: string;
    };
  };

  expected: {
    outputFormat: "json" | "html" | "text";
    requiredFields?: string[];
    shouldContain?: string[];
    shouldNotContain?: string[];
    minLength?: number;
    maxLength?: number;

    // Validaciones semánticas
    semanticChecks?: {
      relevance?: { min: number; description: string };
      coherence?: { min: number; description: string };
      actionability?: { min: number; description: string };
    };
  };

  tags: string[];
  priority: "critical" | "high" | "medium" | "low";
}

export interface PromptTestResult {
  testCase: PromptTestCase;
  passed: boolean;
  executedAt: string;

  execution: {
    duration_ms: number;
    tokens_used: number;
    model: string;
    provider: string;
  };

  validations: {
    structure: {
      passed: boolean;
      errors: string[];
      details: Record<string, boolean>;
    };
    content: {
      passed: boolean;
      errors: string[];
      found: string[];
      missing: string[];
    };
    quality: {
      passed: boolean;
      errors: string[];
      metrics: { length: number; withinBounds: boolean };
    };
    semantic?: {
      passed: boolean;
      scores: Record<string, number>;
      evaluatorResponse?: string;
    };
  };

  response: {
    raw: string;
    parsed: unknown;
  };
}

export interface PromptExecutionResponse {
  raw: string;
  parsed: unknown;
  tokensUsed?: number;
  model?: string;
  provider?: string;
}

export class PromptTester {
  private supabase = supabase;

  async runTest(testCase: PromptTestCase): Promise<PromptTestResult> {
    const startTime = Date.now();

    // 1. Ejecutar el prompt
    const response = await this.executePrompt(testCase);

    const duration = Date.now() - startTime;

    // 2. Validar estructura
    const structureValidation = this.validateStructure(response, testCase.expected);

    // 3. Validar contenido
    const contentValidation = this.validateContent(response.raw, testCase.expected);

    // 4. Validar calidad
    const qualityValidation = this.validateQuality(response.raw, testCase.expected);

    // 5. Validar semánticamente (opcional, usa IA)
    let semanticValidation = undefined;
    if (testCase.expected.semanticChecks) {
      semanticValidation = await this.validateSemantic(
        response.raw,
        testCase.expected.semanticChecks,
        testCase.input.variables
      );
    }

    const allPassed =
      structureValidation.passed &&
      contentValidation.passed &&
      qualityValidation.passed &&
      (semanticValidation?.passed ?? true);

    return {
      testCase,
      passed: allPassed,
      executedAt: new Date().toISOString(),
      execution: {
        duration_ms: duration,
        tokens_used: response.tokensUsed || 0,
        model: response.model || "unknown",
        provider: response.provider || "unknown",
      },
      validations: {
        structure: structureValidation,
        content: contentValidation,
        quality: qualityValidation,
        semantic: semanticValidation,
      },
      response: {
        raw: response.raw,
        parsed: response.parsed,
      },
    };
  }

  async runSuite(promptId: string): Promise<PromptTestResult[]> {
    // Obtener todos los test cases para este prompt
    const { data: testCases } = await this.supabase
      .from("prompt_test_cases")
      .select("*")
      .eq("prompt_id", promptId)
      .order("priority");

    if (!testCases) return [];

    const results: PromptTestResult[] = [];
    for (const tc of testCases) {
      const result = await this.runTest(tc as PromptTestCase);
      results.push(result);

      // Log para CI/CD
      console.log(`[${result.passed ? "PASS" : "FAIL"}] ${tc.name}`);
    }

    return results;
  }

  async runAllSuites(moduleKey?: string): Promise<Record<string, PromptTestResult[]>> {
    // Obtener todos los prompts, opcionalmente filtrados por módulo
    const query = this.supabase.from("prompt_test_cases").select("prompt_id").limit(1000);

    if (moduleKey) {
      // Filtrar por módulo si se proporciona
      query.like("prompt_id", `${moduleKey}%`);
    }

    const { data: prompts } = await query;
    if (!prompts) return {};

    const uniquePromptIds = Array.from(new Set(prompts.map((p) => p.prompt_id)));

    const results: Record<string, PromptTestResult[]> = {};
    for (const promptId of uniquePromptIds) {
      results[promptId] = await this.runSuite(promptId);
    }

    return results;
  }

  private validateStructure(
    response: PromptExecutionResponse,
    expected: PromptTestCase["expected"]
  ): PromptTestResult["validations"]["structure"] {
    const errors: string[] = [];
    const details: Record<string, boolean> = {};

    if (expected.outputFormat === "json") {
      try {
        const parsed =
          typeof response.parsed === "object" && response.parsed !== null
            ? response.parsed
            : JSON.parse(response.raw);

        if (expected.requiredFields) {
          for (const field of expected.requiredFields) {
            const hasField = this.hasNestedField(parsed, field);
            details[field] = hasField;
            if (!hasField) {
              errors.push(`Missing required field: ${field}`);
            }
          }
        }
      } catch (e) {
        errors.push("Response is not valid JSON");
      }
    }

    return { passed: errors.length === 0, errors, details };
  }

  private validateContent(
    raw: string,
    expected: PromptTestCase["expected"]
  ): PromptTestResult["validations"]["content"] {
    const errors: string[] = [];
    const found: string[] = [];
    const missing: string[] = [];

    if (expected.shouldContain) {
      for (const text of expected.shouldContain) {
        if (raw.toLowerCase().includes(text.toLowerCase())) {
          found.push(text);
        } else {
          missing.push(text);
          errors.push(`Should contain: "${text}"`);
        }
      }
    }

    if (expected.shouldNotContain) {
      for (const text of expected.shouldNotContain) {
        if (raw.toLowerCase().includes(text.toLowerCase())) {
          errors.push(`Should NOT contain: "${text}"`);
        }
      }
    }

    return { passed: errors.length === 0, errors, found, missing };
  }

  private validateQuality(
    raw: string,
    expected: PromptTestCase["expected"]
  ): PromptTestResult["validations"]["quality"] {
    const errors: string[] = [];
    const length = raw.length;
    let withinBounds = true;

    if (expected.minLength && length < expected.minLength) {
      errors.push(`Response too short: ${length} < ${expected.minLength}`);
      withinBounds = false;
    }

    if (expected.maxLength && length > expected.maxLength) {
      errors.push(`Response too long: ${length} > ${expected.maxLength}`);
      withinBounds = false;
    }

    return { passed: errors.length === 0, errors, metrics: { length, withinBounds } };
  }

  private async validateSemantic(
    raw: string,
    checks: NonNullable<PromptTestCase["expected"]["semanticChecks"]>,
    originalInput: Record<string, unknown>
  ): Promise<PromptTestResult["validations"]["semantic"]> {
    try {
      // Usar IA para evaluar semánticamente
      const { data } = await this.supabase.functions.invoke("evaluate-prompt-quality", {
        body: {
          response: raw,
          originalInput,
          checks,
        },
      });

      const scores = data?.scores || {};
      let passed = true;

      for (const [metric, config] of Object.entries(checks)) {
        if (config && scores[metric] < config.min) {
          passed = false;
        }
      }

      return { passed, scores, evaluatorResponse: data?.reasoning };
    } catch (error) {
      console.error("Semantic validation failed:", error);
      return {
        passed: false,
        scores: {},
        evaluatorResponse: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private hasNestedField(obj: unknown, path: string): boolean {
    const parts = path.split(".");
    let current: any = obj;
    for (const part of parts) {
      if (current === undefined || current === null) return false;
      current = current[part];
    }
    return current !== undefined;
  }

  private async executePrompt(testCase: PromptTestCase): Promise<PromptExecutionResponse> {
    // Determinar qué Edge Function invocar basándose en el promptId
    const [module] = testCase.promptId.split(".");

    let functionName = "";
    let action = "";

    switch (module) {
      case "board":
        functionName = "board-ai";
        action = testCase.promptId.split(".")[1] || "analyze_card";
        break;
      case "talent":
        functionName = "talent-ai";
        action = testCase.promptId.split(".")[1] || "matching";
        break;
      case "content":
        functionName = "content-ai";
        action = testCase.promptId.split(".")[1] || "generate_script";
        break;
      case "portfolio":
        functionName = "portfolio-ai";
        action = testCase.promptId.split(".")[1] || "search";
        break;
      case "streaming":
        functionName = "streaming-ai-generate";
        action = testCase.promptId.split(".")[1] || "generate_event_content";
        break;
      default:
        throw new Error(`Unknown module for promptId: ${testCase.promptId}`);
    }

    try {
      const { data, error } = await this.supabase.functions.invoke(functionName, {
        body: {
          action,
          ...testCase.input.variables,
          ...testCase.input.context,
        },
      });

      if (error) throw error;

      const raw = typeof data === "string" ? data : JSON.stringify(data);
      const parsed = typeof data === "string" ? this.tryParseJSON(data) : data;

      return {
        raw,
        parsed,
        tokensUsed: data?.tokens_used,
        model: data?.model || data?.ai_model,
        provider: data?.provider,
      };
    } catch (error) {
      console.error(`Error executing prompt ${testCase.promptId}:`, error);
      return {
        raw: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        parsed: null,
        model: "error",
        provider: "error",
      };
    }
  }

  private tryParseJSON(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  /**
   * Genera un reporte de resultados en formato Markdown
   */
  generateReport(results: Record<string, PromptTestResult[]>): string {
    let report = "# Prompt Testing Report\n\n";
    report += `Generated: ${new Date().toISOString()}\n\n`;

    let totalTests = 0;
    let passedTests = 0;

    for (const [promptId, testResults] of Object.entries(results)) {
      report += `## ${promptId}\n\n`;

      for (const result of testResults) {
        totalTests++;
        if (result.passed) passedTests++;

        const status = result.passed ? "✅ PASS" : "❌ FAIL";
        report += `### ${status} - ${result.testCase.name}\n\n`;
        report += `- **Priority:** ${result.testCase.priority}\n`;
        report += `- **Duration:** ${result.execution.duration_ms}ms\n`;
        report += `- **Model:** ${result.execution.model}\n\n`;

        if (!result.passed) {
          report += "**Failures:**\n\n";
          if (!result.validations.structure.passed) {
            report += `- Structure: ${result.validations.structure.errors.join(", ")}\n`;
          }
          if (!result.validations.content.passed) {
            report += `- Content: ${result.validations.content.errors.join(", ")}\n`;
          }
          if (!result.validations.quality.passed) {
            report += `- Quality: ${result.validations.quality.errors.join(", ")}\n`;
          }
          if (result.validations.semantic && !result.validations.semantic.passed) {
            report += `- Semantic: ${JSON.stringify(result.validations.semantic.scores)}\n`;
          }
          report += "\n";
        }
      }
    }

    report += `\n---\n\n`;
    report += `**Summary:** ${passedTests}/${totalTests} tests passed (${((passedTests / totalTests) * 100).toFixed(1)}%)\n`;

    return report;
  }
}
