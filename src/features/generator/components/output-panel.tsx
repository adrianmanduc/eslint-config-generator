"use client";

import {
  CheckIcon, CopyIcon, DownloadIcon, FileCodeIcon, Link2Icon, TerminalIcon, TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { useText } from "@/hooks/use-text";
import { cn } from "@/utils/styles";

import { manifest } from "../catalog";
import { getConfigFileName, getInstallCommand } from "../generate-config";
import { highlight } from "../highlight";
import { plugins } from "../plugins";
import { rangeSupportsMajor } from "../semver";
import { getShareUrl } from "../share";
import { CONFIG_FORMATS, PACKAGE_MANAGERS } from "../types";

import type { GeneratedConfig } from "../generate-config";
import type { CodeToken } from "../highlight";
import type { GeneratorState } from "../types";
import type { GeneratorDispatch } from "../use-generator-state";
import type { ReactNode } from "react";

const COPIED_FEEDBACK_MS = 2000;

const TOKEN_CLASSES: Record<CodeToken["type"], string> = {
  comment: "text-muted-foreground italic",
  string: "text-syntax-string",
  keyword: "text-syntax-keyword",
  plain: "",
};

type OutputPanelProps = {
  state: GeneratorState,
  generated: GeneratedConfig,
  dispatch: GeneratorDispatch,
  className?: string
};

function CopyButton({ text }: { text: string }) {
  const t = useText("generator.output");
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timeout.current), []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }

    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setStatus("idle"), COPIED_FEEDBACK_MS);
  };

  return (
    <Button
      className="h-7 px-2"
      color={status === "failed" ? "destructive" : "secondary"}
      size="sm"
      startContent={status === "copied" ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
      variant="ghost"
      onClick={() => void handleCopy()}
    >
      <span aria-live="polite">{status === "copied" ? t("copied") : status === "failed" ? t("copyFailed") : t("copy")}</span>
    </Button>
  );
}

/** Copies a link that carries the whole config, so anyone can open the same setup. */
function ShareButton({ state }: { state: GeneratorState }) {
  const t = useText("generator.output");
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timeout.current), []);

  const handleShare = async () => {
    try {
      // Safari only allows a clipboard write that starts within the click, so
      // the item takes a promise rather than waiting for the link first.
      if (typeof ClipboardItem === "undefined") {
        await navigator.clipboard.writeText(await getShareUrl(state));
      } else {
        const text = getShareUrl(state).then((url) => new Blob([url], { type: "text/plain" }));

        await navigator.clipboard.write([new ClipboardItem({ "text/plain": text })]);
      }

      setStatus("copied");
    } catch {
      setStatus("failed");
    }

    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setStatus("idle"), COPIED_FEEDBACK_MS);
  };

  return (
    <Button
      className="h-7 px-2"
      color={status === "failed" ? "destructive" : "secondary"}
      size="sm"
      startContent={status === "copied" ? <CheckIcon aria-hidden="true" /> : <Link2Icon aria-hidden="true" />}
      title={t("shareHint")}
      variant="ghost"
      onClick={() => void handleShare()}
    >
      <span aria-live="polite">{status === "copied" ? t("shareCopied") : status === "failed" ? t("copyFailed") : t("share")}</span>
    </Button>
  );
}

function downloadConfig(code: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

type CodeBlockProps = {
  code: string,
  /** Shown at the left of the bar: the file name, or a control that changes the code. */
  label: ReactNode,
  /** Extra actions, placed before the copy button. */
  actions?: ReactNode,
  isHighlighted?: boolean,
  className?: string,
  codeClassName?: string
};

function CodeBlock({
  actions, className, code, codeClassName, isHighlighted = false, label,
}: CodeBlockProps) {
  const tokens: CodeToken[] = isHighlighted ? highlight(code) : [{ type: "plain", text: code }];

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden rounded-md border border-border bg-background", className)}>
      <div className="flex min-h-10 items-center justify-between gap-2 border-b border-border py-1 pr-1.5 pl-3">
        <div className="min-w-0 text-xs text-muted-foreground">{label}</div>
        <div className="flex shrink-0 items-center gap-0.5">
          {actions}
          <CopyButton text={code} />
        </div>
      </div>
      <pre
        className={cn("min-h-0 flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-foreground", codeClassName)}
        // Scrollable regions must be reachable by keyboard.
        tabIndex={0}
      >
        <code>
          {tokens.map((token, index) => (
            // Tokens are derived from the code and never reorder.
            <span key={index} className={TOKEN_CLASSES[token.type]}>{token.text}</span>
          ))}
        </code>
      </pre>
    </div>
  );
}

const VIEWS = ["config", "install"] as const;

type View = (typeof VIEWS)[number];

export function OutputPanel({
  className, dispatch, generated, state,
}: OutputPanelProps) {
  const t = useText("generator.output");
  const [view, setView] = useState<View>("config");
  const installCommand = getInstallCommand(state.packageManager, generated.packages);
  const usesTypeInformation = generated.code.includes("projectService");
  const incompatiblePlugins = plugins.filter(
    (plugin) => plugin.id in state.plugins && !rangeSupportsMajor(manifest[plugin.id].eslintPeerRange, state.eslintMajor),
  );

  return (
    <section
      aria-labelledby="output-title"
      className={cn("flex min-h-0 flex-col rounded-lg border border-border bg-card", className)}
      data-tour="output"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-semibold" id="output-title">{t("title")}</h2>
        <SegmentedControl
          aria-label={t("viewLabel")}
          value={[view]}
          onValueChange={(value) => {
            const next = VIEWS.find((item) => item === value[0]);

            if (next) {
              setView(next);
            }
          }}
        >
          <SegmentedControlItem className="min-h-7 flex-none py-1" value="config">
            <FileCodeIcon aria-hidden="true" />
            {t("configTab")}
          </SegmentedControlItem>
          <SegmentedControlItem className="min-h-7 flex-none py-1" value="install">
            <TerminalIcon aria-hidden="true" />
            {t("installTab")}
          </SegmentedControlItem>
        </SegmentedControl>
      </div>

      {view === "config" ? (
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <CodeBlock
            isHighlighted
            actions={(
              <>
                <ShareButton state={state} />
                <Button
                  className="h-7 px-2"
                  color="secondary"
                  size="sm"
                  startContent={<DownloadIcon aria-hidden="true" />}
                  variant="ghost"
                  onClick={() => downloadConfig(generated.code, getConfigFileName(state.configFormat))}
                >
                  {t("download")}
                </Button>
              </>
            )}
            className="min-h-40 flex-1"
            code={generated.code}
            label={(
              <span className="flex items-center font-mono">
                eslint.config.
                <SegmentedControl
                  aria-label={t("configFormat")}
                  className="ml-0.5 border-0 bg-transparent p-0"
                  value={[state.configFormat]}
                  onValueChange={(value) => {
                    const configFormat = CONFIG_FORMATS.find((item) => item === value[0]);

                    if (configFormat) {
                      dispatch({ type: "setConfigFormat", configFormat });
                    }
                  }}
                >
                  {CONFIG_FORMATS.map((configFormat) => (
                    <SegmentedControlItem
                      key={configFormat}
                      className="min-h-7 flex-none px-2 py-1 font-mono text-xs data-pressed:bg-muted data-pressed:shadow-none"
                      title={t(`configFormats.${configFormat}`)}
                      value={configFormat}
                    >
                      {configFormat}
                    </SegmentedControlItem>
                  ))}
                </SegmentedControl>
              </span>
            )}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
          <div className="flex flex-col gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t("installTitle")}</h3>
              <p className="text-sm text-muted-foreground">{t("installHint")}</p>
            </div>
            <CodeBlock
              code={installCommand}
              codeClassName="wrap-break-word whitespace-pre-wrap"
              label={(
                <SegmentedControl
                  aria-label={t("packageManager")}
                  className="border-0 bg-transparent p-0"
                  value={[state.packageManager]}
                  onValueChange={(value) => {
                    const packageManager = PACKAGE_MANAGERS.find((item) => item === value[0]);

                    if (packageManager) {
                      dispatch({ type: "setPackageManager", packageManager });
                    }
                  }}
                >
                  {PACKAGE_MANAGERS.map((packageManager) => (
                    <SegmentedControlItem
                      key={packageManager}
                      className="min-h-7 flex-none px-2 py-1 font-mono text-xs data-pressed:bg-muted data-pressed:shadow-none"
                      value={packageManager}
                    >
                      {packageManager}
                    </SegmentedControlItem>
                  ))}
                </SegmentedControl>
              )}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("saveTitle")}</h3>
            <p className="text-sm text-muted-foreground">{t("saveHint", { fileName: getConfigFileName(state.configFormat) })}</p>
          </div>
          {usesTypeInformation && (
            <Alert variant="info">
              <TriangleAlertIcon aria-hidden="true" />
              <AlertDescription>{t("typeAware")}</AlertDescription>
            </Alert>
          )}
          {incompatiblePlugins.length > 0 && (
            <Alert variant="warning">
              <TriangleAlertIcon aria-hidden="true" />
              <AlertTitle>{t("warningsTitle", { count: incompatiblePlugins.length, major: String(state.eslintMajor) })}</AlertTitle>
              <AlertDescription>
                {t("warningsDescription", { names: incompatiblePlugins.map((plugin) => plugin.packageName).join(", ") })}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </section>
  );
}
