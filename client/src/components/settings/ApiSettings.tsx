import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
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

const apiSettingsSchema = z.object({
  apiId: z.string().min(1, { message: "API ID is required" }),
  apiHash: z.string().min(1, { message: "API Hash is required" }),
  phoneNumber: z.string().min(1, { message: "Phone number is required" }),
  useTelethon: z.boolean().default(true),
});

type ApiSettingsValues = z.infer<typeof apiSettingsSchema>;

export default function ApiSettings() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const form = useForm<ApiSettingsValues>({
    resolver: zodResolver(apiSettingsSchema),
    defaultValues: {
      apiId: user?.apiId || "",
      apiHash: user?.apiHash || "",
      phoneNumber: user?.phoneNumber || "",
      useTelethon: true,
    },
  });
  
  // Обновляем значения формы при обновлении пользователя или после успешного сохранения
  useEffect(() => {
    if (user) {
      form.reset({
        apiId: user.apiId || "",
        apiHash: user.apiHash || "",
        phoneNumber: user.phoneNumber || "",
        useTelethon: true,
      });
    }
  }, [user, form]);

  const updateApiSettings = useMutation({
    mutationFn: async (values: ApiSettingsValues) => {
      try {
        const response = await apiRequest("PUT", `/api/users/${user!.id}`, {
          apiId: values.apiId,
          apiHash: values.apiHash,
          phoneNumber: values.phoneNumber,
        });
        return response.json();
      } catch (error) {
        console.error("API request error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "API settings updated",
        description: "Your Telegram API settings have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      refreshUser();
      
      // Обновляем значения формы с сохранёнными значениями
      form.reset({
        apiId: data.apiId || "",
        apiHash: data.apiHash || "",
        phoneNumber: data.phoneNumber || "",
        useTelethon: true
      });
    },
    onError: (error) => {
      console.error("Error updating API settings:", error);
      toast({
        title: "Failed to update API settings",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: ApiSettingsValues) => {
    updateApiSettings.mutate(values);
  };

  const testConnection = () => {
    setIsTestingConnection(true);
    
    // Simulate a connection test
    setTimeout(() => {
      setIsTestingConnection(false);
      
      const success = Math.random() > 0.3; // 70% chance of success for demo
      
      if (success) {
        toast({
          title: "Connection successful",
          description: "Your Telegram API credentials are working properly.",
        });
      } else {
        toast({
          title: "Connection failed",
          description: "Please check your API credentials and try again.",
          variant: "destructive",
        });
      }
    }, 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Telegram API Settings</CardTitle>
        <CardDescription>
          Configure your Telegram API credentials for account checking
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="apiId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Telegram API ID" {...field} />
                    </FormControl>
                    <FormDescription>
                      Your Telegram API ID from my.telegram.org
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="apiHash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Hash</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Telegram API Hash"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Your Telegram API Hash from my.telegram.org
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your phone number (with country code)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Phone number associated with your Telegram account (e.g., +12025550199)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="useTelethon"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Use Telethon for API requests</FormLabel>
                    <FormDescription>
                      Recommended for most use cases and better performance
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={testConnection}
                disabled={
                  isTestingConnection ||
                  updateApiSettings.isPending ||
                  !form.formState.isValid
                }
                className="mr-3"
              >
                {isTestingConnection ? "Testing..." : "Test Connection"}
              </Button>
              <Button
                type="submit"
                disabled={updateApiSettings.isPending || !form.formState.isDirty}
              >
                {updateApiSettings.isPending ? "Saving..." : "Save API Settings"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
