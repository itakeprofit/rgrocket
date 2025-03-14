import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserSettings, updateUserSettings } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const appSettingsSchema = z.object({
  batchSize: z.number()
    .min(10, { message: "Batch size must be at least 10" })
    .max(500, { message: "Batch size cannot exceed 500 (Telegram API limit)" }),
  timeout: z.number()
    .min(5, { message: "Timeout must be at least 5 seconds" })
    .max(120, { message: "Timeout cannot exceed 120 seconds" }),
  retries: z.number()
    .min(0, { message: "Retries must be at least 0" })
    .max(10, { message: "Retries cannot exceed 10" }),
  logAllOperations: z.boolean(),
});

type AppSettingsValues = z.infer<typeof appSettingsSchema>;

export default function AppSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/settings'],
  });

  const form = useForm<AppSettingsValues>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: {
      batchSize: settings?.batchSize || 500,
      timeout: settings?.timeout || 30,
      retries: settings?.retries || 3,
      logAllOperations: settings?.logAllOperations ?? true,
    },
    values: settings ? {
      batchSize: settings.batchSize,
      timeout: settings.timeout,
      retries: settings.retries,
      logAllOperations: settings.logAllOperations,
    } : undefined,
  });

  const updateSettings = useMutation({
    mutationFn: (values: AppSettingsValues) => {
      return updateUserSettings(values);
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your application settings have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: (error) => {
      console.error("Error updating settings:", error);
      toast({
        title: "Failed to update settings",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: AppSettingsValues) => {
    updateSettings.mutate(values);
  };

  const resetToDefault = () => {
    form.reset({
      batchSize: 500,
      timeout: 30,
      retries: 3,
      logAllOperations: true,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>Configure how the application works</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Settings</CardTitle>
        <CardDescription>Configure how the application works</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="batchSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batch Size</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={10}
                      max={500}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum: 500 (Telegram API Limit)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timeout"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Timeout (seconds)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={5}
                      max={120}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    How long to wait for each API request before timing out
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="retries"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Retries on Error</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Number of times to retry failed requests
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logAllOperations"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Log all operations</FormLabel>
                    <FormDescription>
                      Recommended for debugging and tracking issues
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={resetToDefault}
                className="mr-3"
              >
                Reset to Default
              </Button>
              <Button
                type="submit"
                disabled={updateSettings.isPending || !form.formState.isDirty}
              >
                {updateSettings.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
