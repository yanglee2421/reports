import { useIndexedStore } from "@/hooks/useIndexedStore";
import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  FormControlLabel,
  Grid,
  Checkbox,
  TextField,
  TextFieldProps,
  FormGroup,
} from "@mui/material";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useSnackbar } from "notistack";

const schema = z.object({
  ip: z
    .string()
    .ip({ message: "无效的IP地址" })
    .min(1, { message: "IP地址不能为空" }),
  port: z
    .number({ message: "端口号必须是数字" })
    .int({ message: "端口号必须是整数" })
    .min(1, { message: "端口号不能为空" })
    .max(65535, { message: "端口号不能大于65535" }),
  autoInput: z.boolean(),
  autoUpload: z.boolean(),
  autoUploadInterval: z
    .number({ message: "自动上传间隔必须是数字" })
    .int({ message: "自动上传间隔必须是整数" })
    .min(1000 * 10, { message: "自动上传间隔不能小于10秒" }),
  tsgz: z.string(),
  tszjy: z.string(),
  tsysy: z.string(),
});

type FormValues = z.infer<typeof schema>;

const useSettingForm = (defaultValues: FormValues) =>
  useForm<FormValues>({
    defaultValues,

    resolver: zodResolver(schema),
  });

const renderNumberValue = (
  value: number,
  focusValue: string,
  focused: boolean
) => {
  if (focused) {
    return focusValue;
  }

  if (Number.isNaN(value)) {
    return "";
  }

  return value;
};

const numberToFocusedValue = (value: number) => {
  if (Number.isNaN(value)) {
    return "";
  }

  return value.toString();
};

type NumberFieldProps = TextFieldProps & {
  field: {
    value: number;
    onChange: (value: number) => void;
    onBlur: () => void;
  };
};

const NumberField = (props: NumberFieldProps) => {
  const { field, ...restProps } = props;

  const [focused, setFocused] = React.useState(false);
  const [focusedValue, setFocusedValue] = React.useState("");

  return (
    <TextField
      value={renderNumberValue(field.value, focusedValue, focused)}
      onChange={(e) => {
        setFocusedValue(e.target.value);
        const numberValue = Number.parseFloat(e.target.value);
        const isNan = Number.isNaN(numberValue);
        if (isNan) return;
        field.onChange(numberValue);
      }}
      onFocus={() => {
        setFocused(true);
        setFocusedValue(numberToFocusedValue(field.value));
      }}
      onBlur={(e) => {
        setFocused(false);
        field.onBlur();
        field.onChange(Number.parseFloat(e.target.value.trim()));
      }}
      {...restProps}
    />
  );
};

export const Component = () => {
  const formId = React.useId();

  const set = useIndexedStore((s) => s.set);
  const hmis = useIndexedStore((s) => s.kh_hmis);
  const snackbar = useSnackbar();
  const form = useSettingForm({
    ip: hmis.host.split(":")[0],
    port: +hmis.host.split(":")[1],
    autoInput: hmis.autoInput,
    autoUpload: hmis.autoUpload,
    autoUploadInterval: hmis.autoUploadInterval,
    tsgz: hmis.tsgz,
    tszjy: hmis.tszjy,
    tsysy: hmis.tsysy,
  });

  return (
    <Card>
      <CardHeader title="康华HMIS设置" subheader="安康" />
      <CardContent>
        <form
          id={formId}
          noValidate
          autoComplete="off"
          onSubmit={form.handleSubmit((data) => {
            set((d) => {
              d.kh_hmis.autoInput = data.autoInput;
              d.kh_hmis.autoUpload = data.autoUpload;
              d.kh_hmis.autoUploadInterval = data.autoUploadInterval;
              d.kh_hmis.host = `${data.ip}:${data.port}`;
              d.kh_hmis.tsgz = data.tsgz;
              d.kh_hmis.tszjy = data.tszjy;
              d.kh_hmis.tsysy = data.tsysy;
            });
            snackbar.enqueueSnackbar("保存成功", { variant: "success" });
          }, console.warn)}
        >
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                control={form.control}
                name="ip"
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    label="IP地址"
                    fullWidth
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                control={form.control}
                name="port"
                render={({ field, fieldState }) => (
                  <NumberField
                    field={field}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    label="端口号"
                    fullWidth
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                control={form.control}
                name="tsgz"
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    label="探伤工长"
                    fullWidth
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                control={form.control}
                name="tszjy"
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    label="探伤质检员"
                    fullWidth
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                control={form.control}
                name="tsysy"
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    label="探伤验收员"
                    fullWidth
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormGroup row>
                <Controller
                  control={form.control}
                  name="autoInput"
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      }
                      label="自动录入"
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="autoUpload"
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      }
                      label="自动上传"
                    />
                  )}
                />
              </FormGroup>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                control={form.control}
                name="autoUploadInterval"
                render={({ field, fieldState }) => (
                  <NumberField
                    field={field}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    label="自动上传间隔"
                    fullWidth
                  />
                )}
              />
            </Grid>
          </Grid>
        </form>
      </CardContent>
      <CardActions>
        <Button form={formId} type="submit">
          保存
        </Button>
      </CardActions>
    </Card>
  );
};
