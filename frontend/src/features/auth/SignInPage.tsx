import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Field, PasswordField } from "@/components/ui/Field";
import { isApiError } from "@/lib/api/client";
import { useSignIn } from "./api";
import { AuthLayout } from "./AuthLayout";
import { FormAlert } from "./FormAlert";

const schema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or username."),
  password: z.string().min(1, "Enter your password."),
});

type Values = z.infer<typeof schema>;

export function SignInPage() {
  const signIn = useSignIn();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    signIn.mutate(values, {
      onSuccess: () => navigate(from, { replace: true }),
    }),
  );

  const problem = signIn.error
    ? isApiError(signIn.error, "rate_limited")
      ? "Too many attempts. Wait a few minutes, then try again."
      : signIn.error.message
    : null;

  return (
    <AuthLayout
      title="Sign in"
      intro="Pick up where you left off. Today's brief is waiting."
      footer={
        <>
          New to Tailr?{" "}
          <Link
            to="/sign-up"
            className="font-semibold text-ink underline decoration-tape decoration-2 underline-offset-4 hover:decoration-ink"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {problem && <FormAlert>{problem}</FormAlert>}
        <Field
          label="Email or username"
          autoComplete="username"
          autoFocus
          error={errors.identifier?.message}
          {...form.register("identifier")}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...form.register("password")}
        />
        <motion.div layout>
          <Button
            type="submit"
            size="lg"
            className="mt-1 w-full"
            loading={signIn.isPending}
          >
            {signIn.isPending ? "Signing in" : "Sign in"}
          </Button>
        </motion.div>
      </form>
    </AuthLayout>
  );
}
