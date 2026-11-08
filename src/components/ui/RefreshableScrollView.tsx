import { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  type ScrollViewProps,
} from "react-native";
import { darkColors } from "../../theme";

type RefreshableScrollViewProps = ScrollViewProps & {
  refreshAction?: () => Promise<void> | void;
};

export function RefreshableScrollView({
  refreshAction,
  refreshControl,
  ...scrollViewProps
}: RefreshableScrollViewProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;

    setRefreshing(true);
    try {
      await Promise.all([
        Promise.resolve(refreshAction?.()),
        new Promise<void>((resolve) => setTimeout(resolve, 500)),
      ]);
    } catch (error) {
      if (__DEV__) console.warn("Could not refresh this screen", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshAction, refreshing]);

  return (
    <ScrollView
      {...scrollViewProps}
      alwaysBounceVertical={scrollViewProps.alwaysBounceVertical ?? true}
      refreshControl={
        refreshControl ?? (
          <RefreshControl
            colors={[darkColors.primary]}
            onRefresh={() => void handleRefresh()}
            refreshing={refreshing}
            tintColor={darkColors.primary}
          />
        )
      }
    />
  );
}
