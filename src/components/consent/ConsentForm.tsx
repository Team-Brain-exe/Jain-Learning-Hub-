import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/consent/FieldError";
import { btn, card, Field, input } from "@/components/studio/ui";
import type { ContentFormat } from "@/data/upload-permissions";
import type { FacultyDirectoryItem } from "@/lib/api-client";
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

export function ConsentForm({
  onSubmit,
  faculty,
  facultyLoading = false,
}: {
  onSubmit: (values: ConsentFormValues) => void | Promise<void>;
  faculty: FacultyDirectoryItem[];
  facultyLoading?: boolean;
}) {
  const uid = useId();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ConsentFormValues>({
    resolver: zodResolver(consentSchema),
    mode: "onTouched",
    defaultValues: {
      consent: false,
      title: "",
      category: undefined,
      format: undefined,
      description: "",
      facultyId: "",
    },
  });

  const consent = watch("consent");

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
  const facultyId = a11y("facultyId");
  const consentA = a11y("consent");

  const canSubmit =
    consent && !isSubmitting && !facultyLoading && faculty.length > 0;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className={`${card} space-y-5`}
    >
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
              {CONSENT_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <FieldError
            id={category.errorId}
            message={errors.category?.message}
          />
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
              {CONSENT_FORMATS.map((item) => (
                <option key={item} value={item}>
                  {formatLabel[item]}
                </option>
              ))}
            </select>
          </Field>
          <FieldError id={format.errorId} message={errors.format?.message} />
        </div>
      </div>

      <div>
        <Field
          label="Description"
          hint="What is the content about, and who is it for?"
        >
          <textarea
            id={description.id}
            rows={4}
            className={input}
            {...description.props}
            {...register("description")}
          />
        </Field>
        <FieldError
          id={description.errorId}
          message={errors.description?.message}
        />
      </div>

      <div>
        <Field
          label="Faculty reviewer"
          hint="Choose an active faculty member to review this request."
        >
          <select
            id={facultyId.id}
            className={input}
            defaultValue=""
            disabled={facultyLoading || faculty.length === 0}
            {...facultyId.props}
            {...register("facultyId")}
          >
            <option value="" disabled>
              {facultyLoading ? "Loading faculty..." : "Select a faculty member"}
            </option>
            {faculty.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} — {member.department}
              </option>
            ))}
          </select>
        </Field>
        <FieldError
          id={facultyId.errorId}
          message={errors.facultyId?.message}
        />
        {!facultyLoading && faculty.length === 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            No active faculty members are currently available. Please try again
            later.
          </p>
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
            I confirm this content is my own (or I have the right to share it),
            and I consent to it being reviewed by faculty and published on the
            JAIN FET Learning Hub if approved.
          </label>
        </div>
        <FieldError
          id={consentA.errorId}
          message={errors.consent?.message}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className={`${btn} w-full sm:w-auto`}
          disabled={!canSubmit}
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
