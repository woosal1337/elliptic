import { FC, useState } from "react"
import { Platform, View, ViewStyle } from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"

import { Button } from "@/components/Button"
import { Sheet } from "@/components/Sheet"
import { useAppTheme } from "@/theme/context"
import { toISODate } from "@/utils/taskOptions"

interface Props {
  visible: boolean
  onClose: () => void
  onPick: (iso: string) => void
  initial?: string | null
}

/** Native date picker — an iOS inline sheet with a confirm, an Android dialog. */
export const DatePickerSheet: FC<Props> = ({ visible, onClose, onPick, initial }) => {
  const {
    theme: { spacing },
  } = useAppTheme()
  const [date, setDate] = useState<Date>(initial ? new Date(initial) : new Date())

  if (Platform.OS === "android") {
    return visible ? (
      <DateTimePicker
        value={date}
        mode="date"
        onChange={(event, picked) => {
          onClose()
          if (event.type === "set" && picked) onPick(toISODate(picked))
        }}
      />
    ) : null
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Pick a date">
      <View style={[$body, { paddingHorizontal: spacing.lg }]}>
        <DateTimePicker
          value={date}
          mode="date"
          display="inline"
          onChange={(_event, picked) => {
            if (picked) setDate(picked)
          }}
        />
        <Button
          text="Set date"
          preset="filled"
          onPress={() => {
            onPick(toISODate(date))
            onClose()
          }}
        />
      </View>
    </Sheet>
  )
}

const $body: ViewStyle = { gap: 12 }
