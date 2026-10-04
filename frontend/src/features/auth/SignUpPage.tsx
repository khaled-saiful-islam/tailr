import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Field, PasswordField } from "@/components/ui/Field";
import { isApiError } from "@/lib/api/client";
import { useSignUp } from "./api";
import { AuthLayout } from "./AuthLayout";
import { FormAlert } from "./FormAlert";
import { PasswordMeter } from "./PasswordMeter";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tell us your name.")
    .max(120, "Keep it under 120 characters."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
});

type Values = z.infer<typeof schema>;

export function SignUpPage() {
  const signUp = useSignUp();
  const navigate = useNavigate();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const { errors } = form.formState;
  const password = form.watch("password");

  // Server-side field problems (e.g. the email is taken) land on the right field.
  useEffect(() => {
    const error = signUp.error;
    if (isApiError(error, "email_taken")) {
      form.setError("email", {
        message: "An account with this email already exists. Sign in instead.",
      });
    } else if (isApiError(error, "validation_error")) {
      for (const [field, message] of Object.entries(error.fieldIssues())) {
        if (field === "name" || field === "email" || field === "password")
          form.setError(field, { message });
      }
    }
  }, [signUp.error, form]);

  const onSubmit = form.handleSubmit((values) =>
    signUp.mutate(
      { ...values, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      { onSuccess: () => navigate("/", { replace: true }) },
    ),
  );

  const general =
    signUp.error &&
    !isApiError(signUp.error, "email_taken") &&
    !isApiError(signUp.error, "validation_error")
      ? signUp.error.message
      : null;

  return (
    <AuthLayout
      title="Create your account"
      intro="A few minutes to set up. Then Tailr finds jobs that match you."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/sign-in"
            className="font-semibold text-ink underline decoration-tape decoration-2 underline-offset-4 hover:decoration-ink"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {general && <FormAlert>{general}</FormAlert>}
        <Field
          label="Full name"
          autoComplete="name"
          autoFocus
          error={errors.name?.message}
          {...form.register("name")}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...form.register("email")}
        />
        <div className="flex flex-col gap-2">
          <PasswordField
            label="Password"
            autoComplete="new-password"
            error={errors.password?.message}
            hint={errors.password ? undefined : "At least 8 characters."}
            {...form.register("password")}
          />
          <PasswordMeter password={password} />
        </div>
        <Button
          type="submit"
          size="lg"
          className="mt-1 w-full"
          loading={signUp.isPending}
        >
          {signUp.isPending ? "Creating your account" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
