import { Copy } from '@/constants/Brand';
import { FlowBoard } from '@/src/components/FlowBoard';
import type { Todo } from '@/src/types/todo';

type Props = {
  todos: Todo[];
  onPressTodo: (todo: Todo) => void;
  onToggleTodo: (id: string) => void;
  onAdd: () => void;
};

/** Timed schedule for Today — open runway timeline. */
export function TimelineBoard(props: Props) {
  return (
    <FlowBoard
      mode="runway"
      eyebrow="Runway"
      addLabel="+ Dock"
      emptyTitle={Copy.emptyRunway}
      emptyMessage={Copy.emptyRunwayHint}
      emptyCta={Copy.dockTask}
      {...props}
    />
  );
}
