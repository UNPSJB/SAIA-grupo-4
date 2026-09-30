import { ButtonGroup, HStack, IconButton, Pagination, Text } from "@chakra-ui/react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface TablePaginationProps {
  count: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  labelSingular: string;
  labelPlural: string;
}

export const TablePagination = ({
  count,
  page,
  pageSize,
  onPageChange,
  labelSingular,
  labelPlural,
}: TablePaginationProps) => (
  <HStack justify="center" mt={4}>
    <Text fontSize="sm" color="gray.600" textAlign="left">
      {count === 1
        ? `Total: 1 ${labelSingular}`
        : `Total: ${count} ${labelPlural}`}
    </Text>

    {count > pageSize && (
      <Pagination.Root
        count={count}
        pageSize={pageSize}
        page={page}
        onPageChange={(e) => onPageChange(e.page)}
      >
        <ButtonGroup variant="ghost" size="sm">
          <Pagination.PrevTrigger asChild>
            <IconButton aria-label="Página anterior">
              <FiChevronLeft />
            </IconButton>
          </Pagination.PrevTrigger>

          <Pagination.Items
            render={(item) => (
              <IconButton
                variant={item.value === page ? "solid" : "ghost"}
                colorPalette={item.value === page ? "green" : "gray"}
                aria-label={`Página ${item.value}`}
              >
                {item.value}
              </IconButton>
            )}
          />

          <Pagination.NextTrigger asChild>
            <IconButton aria-label="Página siguiente">
              <FiChevronRight />
            </IconButton>
          </Pagination.NextTrigger>
        </ButtonGroup>
      </Pagination.Root>
    )}
  </HStack>
);