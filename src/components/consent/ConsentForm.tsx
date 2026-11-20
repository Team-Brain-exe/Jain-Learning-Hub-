import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/consent/FieldError";
import { btn, card, Field, input } from "@/components/studio/ui";
import type { ContentFormat } from "@/data/upload-permissions";
import {
  CONSENT_CATEGORIES,
  CONSENT_FORMATS,
  consentSchema,
  type ConsentFormValues,
} from "@/lib/consent-schema";

const formatLabel: Record<ContentFormat, string> = {
  video: "Video",
  audio: "Audio",
  ppt: "Presentation (PPT)",
  pdf: "PDF",
  docx: "Word document (DOCX)",
  image: "Image",
};

type FieldName = keyof ConsentFormValues;

/**
 * Upload-permission consent form. Presentation + validation only: the parent decides what
 * happens on submit (e.g. `requestUploadPermission(user, values)` from `@/data/upload-permissions`).
 */
export function ConsentForm({
  onSubmit,
  defaultValues,
}: {
  onSubmit: (values: ConsentFormValues) => void;
  defaultValues?: Partial<ConsentFormValues>;
}) {
  const uid = useId();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ConsentFormValues>({
    resolver: zodResolver(consentSchema),
    // validate after the first blur, then live; never while the first character is being typed
    mode: "onTouched",
    defaultValues: { consent: false, ...defaultValues },
  });

  const consent = watch("consent");
  const proposalName = watch("proposalName");

  /** id + aria wiring shared by every control */
  const a11y = (name: FieldName) => {
    const errorId = `${uid}-${name}-error`;
    const invalid = Boolean(errors[name]);
    return {
      id: `${uid}-${name}`,
      errorId,
      props: {
        "aria-invalid": invalid,
        "aria-describedby": invalid ? errorId : undefined,
      },
    };
  };

  const title = a11y("title");
  const category = a11y("category");
  const format = a11y("format");
  const description = a11y("description");
  const facultyEmail = a11y("facultyEmail");
  const consentA = a11y("consent");

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className={`${card} space-y-5`}>
      <div>
        <Field label="Content title">
          <input
            id={title.id}
            className={input}
            autoComplete="off"
            {...title.props}
            {...register("title")}
          />
        </Field>
        <FieldError id={title.errorId} message={errors.title?.message} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Field label="Category">
            <select
              id={category.id}
              className={input}
              defaultValue=""
              {...category.props}
              {...register("category")}
            >
              <option value="" disabled>
                Select a category
              </option>
              {CONSENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <FieldError id={category.errorId} message={errors.category?.message} />
        </div>
        <div>
          <Field label="Content format">
            <select
              id={format.id}
              className={input}
              defaultValue=""
              {...format.props}
              {...register("format")}
            >
              <option value="" disabled>
                Select a format
              </option>
              {CONSENT_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {formatLabel[f]}
                </option>
              ))}
            </select>
          </Field>
          <FieldError id={format.errorId} message={errors.format?.message} />
        </div>
      </div>

      <div>
        <Field label="Description" hint="What is the content about, and who is it for?">
          <textarea
            id={description.id}
            rows={4}
            className={input}
            {...description.props}
            {...register("description")}
          />
        </Field>
        <FieldError id={description.errorId} message={errors.description?.message} />
      </div>

      <div>
        <Field label="Faculty email" hint="The faculty member who will review this request.">
          <input
            id={facultyEmail.id}
            type="email"
            inputMode="email"
            autoComplete="email"
            className={input}
            {...facultyEmail.props}
            {...register("facultyEmail")}
          />
        </Field>
        <FieldError id={facultyEmail.errorId} message={errors.facultyEmail?.message} />
      </div>

      <div>
        <Field
          label="Supporting proposal (optional)"
          hint="Only the file name is recorded in this demo."
        >
          <input
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx"
            className={`${input} file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-semibold`}
            onChange={(e) =>
              setValue("proposalName", e.target.files?.[0]?.name ?? "", { shouldDirty: true })
            }
          />
        </Field>
        {proposalName && (
          <p className="mt-1 text-xs text-muted-foreground">Selected: {proposalName}</p>
        )}
      </div>

      <div>
        <div className="flex items-start gap-3">
          <input
            id={consentA.id}
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
            {...consentA.props}
            {...register("consent")}
          />
          <label htmlFor={consentA.id} className="text-sm">
            I confirm this content is my own (or I have the right to share it), and I consent to it
            being reviewed by faculty and published on the JAIN FET Learning Hub if approved.
          </label>
        </div>
        <FieldError id={consentA.errorId} message={errors.consent?.message} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className={`${btn} w-full sm:w-auto`}
          disabled={!consent || isSubmitting}
        >
          Request upload permission
        </button>
        {!consent && (
          <p className="text-xs text-muted-foreground">
            Tick the declaration above to enable this button.
          </p>
        )}
      </div>
    </form>
  );
}
