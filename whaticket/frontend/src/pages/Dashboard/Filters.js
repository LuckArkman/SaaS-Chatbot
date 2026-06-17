import React from 'react';
import { Grid, Paper, Button, TextField } from '@mui/material';
import Title from './Title';

const Filters = () => {
  // placeholder (mantido para compatibilidade se for usado por outras telas)
  return (
    <Grid item xs={12}>
      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Title>Filtros</Title>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth label="Inicial" type="date" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth label="Final" type="date" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={12} md={3}>
            <Button variant="contained" className="buttonHover" fullWidth>Filtrar</Button>
          </Grid>
        </Grid>
      </Paper>
    </Grid>
  );
};

export default Filters;
