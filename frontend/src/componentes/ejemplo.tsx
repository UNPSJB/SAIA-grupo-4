import { Box, Button, Text } from '@chakra-ui/react'

export default function Ejemplo(){
    return(
        <Box>
            <Text fontSize="2xl" fontWeight="bold" mb={4}>
                ¡Mi primer componente con Chakra!
            </Text>
            <Button colorScheme="teal">Empezar a desarrollar</Button>    
        </Box>    
    );
}